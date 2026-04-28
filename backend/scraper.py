from playwright.async_api import async_playwright
import logging
import re
import asyncio
import os
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Persistent browser data directory (saves Amazon login cookies between sessions)
BROWSER_DATA_DIR = os.path.join(os.path.expanduser("~"), ".fprds_browser_data")

# Maximum pages to paginate through (10 reviews per page)
MAX_PAGES = 100  # Up to 1000 reviews

# Stealth JavaScript to avoid bot detection
STEALTH_JS = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
window.chrome = { runtime: {} };
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
"""


def _extract_asin(url):
    """Extract ASIN from an Amazon URL."""
    patterns = [
        r'/dp/([A-Z0-9]{10})',
        r'/gp/product/([A-Z0-9]{10})',
        r'/product-reviews/([A-Z0-9]{10})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def _parse_reviews_from_soup(soup):
    """Extract reviews from a BeautifulSoup-parsed Amazon page."""
    reviews = []
    
    review_blocks = soup.select('div[data-hook="review"]')
    if not review_blocks:
        review_blocks = soup.select('div[id^="customer_review-"]')
    
    for block in review_blocks:
        try:
            review_body = (
                block.select_one('span[data-hook="review-body"]') or
                block.select_one('div.review-text') or
                block.select_one('span.review-text')
            )
            text = review_body.get_text(strip=True) if review_body else ""
            text = re.sub(r'Read more$', '', text).strip()
            
            rating_elem = (
                block.select_one('i[data-hook="review-star-rating"]') or
                block.select_one('i[data-hook="cmps-review-star-rating"]') or
                block.select_one('i.review-rating')
            )
            rating_text = rating_elem.get_text() if rating_elem else ""
            rating = float(rating_text.split(' out of')[0]) if 'out of' in rating_text else None
            
            author_elem = block.select_one('span.a-profile-name')
            author = author_elem.get_text(strip=True) if author_elem else "Amazon Customer"

            date_elem = block.select_one('span[data-hook="review-date"]')
            date = date_elem.get_text(strip=True) if date_elem else None
            
            if text and len(text) > 10:
                reviews.append({
                    'review_text': text,
                    'rating': rating,
                    'author': author,
                    'source': 'Amazon',
                    'date': date
                })
        except Exception as e:
            logger.error(f"Error parsing review block: {e}")
            continue
    
    return reviews


def _extract_rating_summary(soup):
    """Extract overall rating, total count, and star distribution from product page."""
    summary = {
        'overall_rating': None,
        'total_ratings': None,
        'star_distribution': {}
    }
    
    rating_elem = soup.select_one('span[data-hook="rating-out-of-text"]')
    if not rating_elem:
        rating_elem = soup.select_one('#acrPopover span.a-size-base')
    if rating_elem:
        text = rating_elem.get_text(strip=True)
        match = re.search(r'([\d.]+)\s*out of', text)
        if match:
            summary['overall_rating'] = float(match.group(1))
    
    count_elem = soup.select_one('span[data-hook="total-review-count"]')
    if not count_elem:
        count_elem = soup.select_one('#acrCustomerReviewText')
    if count_elem:
        text = count_elem.get_text(strip=True)
        match = re.search(r'([\d,]+)', text)
        if match:
            summary['total_ratings'] = int(match.group(1).replace(',', ''))
    
    # Star distribution using aria-label attributes
    # Amazon uses: aria-label="76 percent of reviews have 5 stars"
    all_links = soup.select('a[aria-label]')
    for link in all_links:
        label = link.get('aria-label', '')
        match = re.search(r'(\d+)\s*percent.*?(\d)\s*star', label)
        if match:
            pct = int(match.group(1))
            star = match.group(2)
            summary['star_distribution'][star] = pct
    
    return summary


async def _create_browser_context(playwright):
    """Create a persistent browser context with stealth settings.
    
    Uses a persistent user data directory so Amazon login cookies
    are preserved between scraping sessions. The user only needs
    to sign in once.
    """
    context = await playwright.chromium.launch_persistent_context(
        BROWSER_DATA_DIR,
        headless=False,
        slow_mo=150,
        args=[
            "--start-maximized",
            "--disable-blink-features=AutomationControlled",
        ],
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        no_viewport=True,
        locale='en-IN',
        timezone_id='Asia/Kolkata',
    )
    await context.add_init_script(STEALTH_JS)
    return context


async def _handle_signin_wall(page, timeout_seconds=120):
    """Wait for user to manually sign in if Amazon requires it.
    
    Returns True if sign-in was completed, False if timed out.
    Handles sign-in, CVF (verification), and claim pages.
    """
    signin_patterns = ["/ap/signin", "/ax/claim", "/ap/cvf", "/ap/mfa"]
    
    def _is_signin_page(url):
        return any(p in url for p in signin_patterns)
    
    current_url = page.url
    if not _is_signin_page(current_url):
        return True  # Not on sign-in page
    
    logger.warning(f"Amazon sign-in required. Waiting up to {timeout_seconds}s for manual sign-in...")
    logger.warning("Please sign in to Amazon in the browser window that opened.")
    
    for i in range(timeout_seconds):
        await asyncio.sleep(1)
        current_url = page.url
        if not _is_signin_page(current_url):
            logger.info(f"Sign-in completed after {i+1} seconds! URL: {current_url[:80]}")
            await asyncio.sleep(3)  # Wait for page to finish loading
            return True
    
    logger.error("Sign-in timed out!")
    return False


async def scrape_amazon(url):
    """Scrape ALL reviews from an Amazon product by paginating through review pages.
    
    Uses a persistent browser context that saves login cookies.
    If Amazon requires sign-in, the browser window stays open for the user
    to manually log in. After login, cookies are saved for future sessions.
    
    Strategy:
    1. Navigate to product page (get title, rating summary)
    2. Navigate to review listing page (using ASIN)
    3. If sign-in is required, wait for manual sign-in (cookies saved for next time)
    4. After sign-in, explicitly navigate to the review page
    5. Paginate through all review pages collecting reviews
    6. Return all reviews + rating summary
    """
    logger.info(f"Scraping Amazon URL: {url}")
    
    async with async_playwright() as p:
        try:
            context = await _create_browser_context(p)
        except Exception as e:
            logger.error(f"Failed to launch browser: {e}")
            return None
        
        page = context.pages[0] if context.pages else await context.new_page()
        
        try:
            # Visit homepage for session warmup
            logger.info("Visiting Amazon homepage...")
            try:
                await page.goto("https://www.amazon.in", timeout=30000, wait_until='domcontentloaded')
                await asyncio.sleep(1)
            except Exception as e:
                logger.warning(f"Homepage load failed: {e}")
            
            # Navigate to product page
            logger.info(f"Navigating to product: {url}")
            await page.goto(url, timeout=60000, wait_until='domcontentloaded')
            await asyncio.sleep(2)
            
            # Check for CAPTCHA
            title = await page.title()
            if "Robot Check" in title or "CAPTCHA" in title:
                logger.warning("CAPTCHA detected on product page.")
                await context.close()
                return None
            
            # Scroll down to load reviews section and get rating summary
            logger.info("Scrolling to load reviews section...")
            for _ in range(15):
                await page.evaluate("window.scrollBy(0, 500)")
                await asyncio.sleep(0.3)
            await asyncio.sleep(2)
            
            # Parse product page for title and rating summary
            content = await page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            product_title_elem = soup.select_one('#productTitle')
            product_title = product_title_elem.get_text(strip=True) if product_title_elem else "Amazon Product"
            logger.info(f"Product: {product_title}")
            
            rating_summary = _extract_rating_summary(soup)
            logger.info(f"Rating summary: {rating_summary}")
            
            # Extract ASIN for direct review URL navigation
            asin = _extract_asin(page.url)
            if not asin:
                asin = _extract_asin(url)
            
            # Get product page reviews as fallback
            product_page_reviews = _parse_reviews_from_soup(soup)
            logger.info(f"Product page reviews: {len(product_page_reviews)}")
            
            if not asin:
                logger.warning("Could not extract ASIN from URL. Using product page reviews only.")
                await context.close()
                return {
                    'product_title': product_title,
                    'reviews': product_page_reviews,
                    'rating_summary': rating_summary
                }
            
            # Navigate to the reviews page
            all_reviews = []
            reviews_page_reached = False
            review_base_url = f"https://www.amazon.in/product-reviews/{asin}?reviewerType=all_reviews&pageNumber=1"
            
            logger.info(f"Navigating to reviews page: {review_base_url}")
            await page.goto(review_base_url, timeout=30000, wait_until='domcontentloaded')
            await asyncio.sleep(3)
            
            # Handle sign-in wall (waits for user to sign in manually)
            signed_in = await _handle_signin_wall(page)
            
            if signed_in:
                # After sign-in, Amazon may redirect to a different page (homepage, CVF completion, etc.)
                # We need to explicitly navigate to the review page
                current_url = page.url
                if "product-reviews" not in current_url:
                    logger.info(f"Post-signin URL: {current_url[:80]} — Navigating to review page...")
                    await page.goto(review_base_url, timeout=30000, wait_until='domcontentloaded')
                    await asyncio.sleep(3)
                    
                    # Check if we got redirected again
                    if "/ap/signin" in page.url or "/ax/claim" in page.url:
                        logger.warning("Still blocked after sign-in. Using product page reviews.")
                    elif "product-reviews" in page.url:
                        reviews_page_reached = True
                        logger.info(f"Successfully reached review page: {page.url[:80]}")
                    else:
                        logger.warning(f"Unexpected post-signin page: {page.url[:80]}")
                else:
                    reviews_page_reached = True
                    logger.info(f"On reviews page: {page.url[:80]}")
            else:
                logger.warning("Could not reach reviews page — sign-in timed out.")
            
            # Paginate through all review pages
            if reviews_page_reached:
                page_num = 1
                while page_num <= MAX_PAGES:
                    logger.info(f"Extracting reviews from page {page_num}...")
                    
                    # Scroll to load all reviews on page
                    for _ in range(5):
                        await page.evaluate("window.scrollBy(0, 500)")
                        await asyncio.sleep(0.3)
                    await asyncio.sleep(1)
                    
                    content = await page.content()
                    soup = BeautifulSoup(content, 'html.parser')
                    page_reviews = _parse_reviews_from_soup(soup)
                    
                    if not page_reviews:
                        logger.info(f"No reviews on page {page_num}. Reached end.")
                        break
                    
                    all_reviews.extend(page_reviews)
                    logger.info(f"Page {page_num}: {len(page_reviews)} reviews (total: {len(all_reviews)})")
                    
                    # Find and click "Next" or "Show more" button
                    is_ajax_load = False
                    next_btn = await page.query_selector('li.a-last a')
                    if not next_btn:
                        next_btn = await page.query_selector('a:has-text("Next page")')
                    
                    # Handle new Amazon UI "10 more reviews" buttons
                    if not next_btn:
                        # Try case-insensitive matching for various "more reviews" text
                        next_btn = await page.query_selector('span:has-text("more reviews")')
                        if next_btn: is_ajax_load = True
                    if not next_btn:
                        next_btn = await page.query_selector('a:has-text("more reviews")')
                        if next_btn: is_ajax_load = True
                    if not next_btn:
                        next_btn = await page.query_selector('input[value*="more reviews" i]')
                        if next_btn: is_ajax_load = True
                    if not next_btn:
                        next_btn = await page.query_selector('[data-hook="cr-show-more-reviews-button"]')
                        if next_btn: is_ajax_load = True
                    if not next_btn:
                        next_btn = await page.query_selector('a:has-text("See more reviews")')
                        if next_btn: is_ajax_load = True
                    
                    if next_btn:
                        try:
                            # Verify the button is visible and enabled
                            is_visible = await next_btn.is_visible()
                            if not is_visible:
                                logger.info("Next/More button found but not visible. Reached end.")
                                break

                            page_num += 1
                            await next_btn.click()
                            
                            # If it's a traditional link, wait for navigation.
                            # If it's an AJAX button, just wait a few seconds.
                            if not is_ajax_load:
                                try:
                                    await page.wait_for_load_state('domcontentloaded', timeout=10000)
                                except Exception as e:
                                    logger.warning(f"Navigation wait timeout: {e}")
                            
                            await asyncio.sleep(2.5)  # Wait for new reviews to render
                            
                            # Check for CAPTCHA or redirect
                            current_url = page.url
                            if "/ap/signin" in current_url or "/ax/claim" in current_url:
                                logger.warning("Sign-in required during pagination. Stopping.")
                                break
                            title = await page.title()
                            if "Robot Check" in title:
                                logger.warning("CAPTCHA during pagination. Stopping.")
                                break
                        except Exception as e:
                            logger.warning(f"Error clicking Next/More on page {page_num}: {e}")
                            break
                    else:
                        logger.info("No 'Next' or 'More' button found. Reached last page.")
                        break
                
                logger.info(f"Total reviews from pagination: {len(all_reviews)}")
            
            await context.close()
            
            # Use paginated reviews if available, otherwise fall back to product page reviews
            final_reviews = all_reviews if all_reviews else product_page_reviews
            
            if not final_reviews:
                logger.warning("No reviews found.")
                return None
            
            # Deduplicate
            seen = set()
            unique_reviews = []
            for r in final_reviews:
                if r['review_text'] not in seen:
                    seen.add(r['review_text'])
                    unique_reviews.append(r)
            
            logger.info(f"Final review count: {len(unique_reviews)} for '{product_title}'")
            
            return {
                'product_title': product_title,
                'reviews': unique_reviews,
                'rating_summary': rating_summary
            }
            
        except Exception as e:
            logger.error(f"Error scraping Amazon: {e}")
            try:
                await context.close()
            except:
                pass
            return None


def get_mock_data():
    """Return realistic mock data for demo purposes"""
    logger.info("Returning mock data for demo")
    return {
        'product_title': "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
        'reviews': [
            {
                'review_text': "These headphones are absolutely amazing! The noise cancellation is top notch and the sound quality is crisp. Battery life lasts forever.",
                'rating': 5.0,
                'author': "AudioPhile99",
                'source': 'Demo',
                'date': "Reviewed on September 21, 2023"
            },
            {
                'review_text': "Overpriced garbage. Stopped working after 2 days. Customer support was useless. Do not buy!",
                'rating': 1.0,
                'author': "AngryCustomer",
                'source': 'Demo',
                'date': "Reviewed on October 5, 2023"
            },
            {
                'review_text': "Good product but a bit expensive. Comfort is great for long flights. The app is a bit buggy though.",
                'rating': 4.0,
                'author': "FrequentFlyer",
                'source': 'Demo',
                'date': "Reviewed on November 12, 2023"
            },
            {
                'review_text': "BEST HEADPHONES EVER!!! BUY NOW!!! LIMITED TIME OFFER!!!",
                'rating': 5.0,
                'author': "Bot123",
                'source': 'Demo',
                'date': "Reviewed on January 1, 2024"
            },
            {
                'review_text': "I received this product for free. It is okay. Not great, not terrible.",
                'rating': 3.0,
                'author': "ReviewerX",
                'source': 'Demo',
                'date': "Reviewed on February 15, 2024"
            },
            {
                'review_text': "Decent quality for the price. The fit could be a bit better, but the sound is clear and noise cancelling works fine.",
                'rating': 4.0,
                'author': "MusicLover88",
                'source': 'Demo',
                'date': "Reviewed on March 10, 2024"
            },
            {
                'review_text': "Absolutely terrible! Broke within a week. The plastic feels cheap and the connection drops constantly.",
                'rating': 1.0,
                'author': "DisappointedBuyer",
                'source': 'Demo',
                'date': "Reviewed on March 15, 2024"
            },
            {
                'review_text': "FANTASTIC PRODUCT!!! MUST BUY!!! 10/10 WOULD RECOMMEND!!!",
                'rating': 5.0,
                'author': "HappyCustomer123",
                'source': 'Demo',
                'date': "Reviewed on April 2, 2024"
            },
            {
                'review_text': "They are a bit heavy on the head after a few hours of use. Otherwise, the sound stage is impressive.",
                'rating': 3.5,
                'author': "TechGeek",
                'source': 'Demo',
                'date': "Reviewed on April 10, 2024"
            },
            {
                'review_text': "Okay headphones, but not worth the premium price tag. You can find better alternatives for half the price.",
                'rating': 3.0,
                'author': "ValueShopper",
                'source': 'Demo',
                'date': "Reviewed on April 20, 2024"
            },
            {
                'review_text': "The microphone quality is abysmal. People can barely hear me on calls. Do not recommend for home office use.",
                'rating': 2.0,
                'author': "WFH_Worker",
                'source': 'Demo',
                'date': "Reviewed on May 5, 2024"
            },
            {
                'review_text': "Incredible bass response! These are perfect for electronic music. Best headphones I've ever owned.",
                'rating': 5.0,
                'author': "BassHead",
                'source': 'Demo',
                'date': "Reviewed on May 15, 2024"
            },
            {
                'review_text': "SCAM!!! DO NOT BUY!!! FAKE REVIEWS!!!",
                'rating': 1.0,
                'author': "TruthTeller",
                'source': 'Demo',
                'date': "Reviewed on June 1, 2024"
            },
            {
                'review_text': "Battery life is exactly as advertised. I only need to charge them once a week with daily use.",
                'rating': 4.5,
                'author': "CommuterLife",
                'source': 'Demo',
                'date': "Reviewed on June 10, 2024"
            },
            {
                'review_text': "A solid upgrade from the previous model. The multi-device Bluetooth connection works flawlessly.",
                'rating': 4.5,
                'author': "GadgetReviewer",
                'source': 'Demo',
                'date': "Reviewed on June 20, 2024"
            }
        ],
        'rating_summary': {
            'overall_rating': 4.2,
            'total_ratings': 1547,
            'star_distribution': {'5': 55, '4': 20, '3': 10, '2': 5, '1': 10}
        }
    }
