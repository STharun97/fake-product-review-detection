"""
Fake Review Detection API Server
FastAPI backend with ML-powered review analysis
"""
# Fix for Playwright on Windows: use ProactorEventLoopPolicy
import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os


import uvicorn
import csv
import io
import json
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection

ENABLE_DB = os.getenv('ENABLE_DB', 'true').lower() == 'true'
ENABLE_DB = os.getenv('ENABLE_DB', 'true').lower() == 'true'
db = None
local_storage = [] # In-memory storage when DB is disabled

if ENABLE_DB:
    try:
        mongo_url = os.environ['MONGO_URL']
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ['DB_NAME']]
        logger.info("Connected to MongoDB")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        ENABLE_DB = False
else:
    logger.info("MongoDB disabled via environment variable")

# Create the main app
app = FastAPI(
    title="Fake Review Detection API",
    description="ML-powered fake product review detection system",
    version="2.0.0"
)

# Create API router with /api prefix
api_router = APIRouter(prefix="/api")



# Import ML modules after app setup
from ml_models.predictor import predictor
from ml_models.lstm_model import lstm_model, is_lstm_available
from ml_models.dataset_manager import dataset_manager
from ml_models.text_preprocessor import preprocessor
import scraper


# Pydantic Models
class ReviewInput(BaseModel):
    """Input model for review analysis"""
    text: str = Field(..., min_length=5, max_length=5000, description="Review text to analyze")
    model: Optional[str] = Field(default="auto", description="Model to use: auto, traditional, lstm")


class BulkReviewItem(BaseModel):
    """Single review in bulk analysis"""
    review_text: str
    product_name: Optional[str] = None
    rating: Optional[int] = None


class BulkAnalysisInput(BaseModel):
    """Input for bulk analysis"""
    reviews: List[BulkReviewItem]
    model: Optional[str] = Field(default="auto", description="Model to use: auto, traditional, lstm")


class URLAnalysisInput(BaseModel):
    """Input for URL analysis"""
    url: str
    model: Optional[str] = Field(default="auto", description="Model to use: auto, traditional, lstm")


class Indicator(BaseModel):
    """Fake review indicator"""
    type: str
    description: str
    severity: str


class PredictionResult(BaseModel):
    """Prediction result model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_text: str
    processed_text: str
    prediction: str
    is_fake: bool
    confidence: float
    fake_probability: float
    genuine_probability: float
    model_used: str
    indicators: List[Indicator]
    product_name: Optional[str] = None
    rating: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BulkPredictionResult(BaseModel):
    """Result for bulk analysis"""
    id: str
    original_text: str
    prediction: str
    is_fake: bool
    confidence: float
    model_used: str
    product_name: Optional[str] = None
    rating: Optional[float] = None
    author: Optional[str] = None
    source: Optional[str] = None
    date: Optional[str] = None


class BulkAnalysisResponse(BaseModel):
    """Response for bulk analysis"""
    total_analyzed: int
    fake_count: int
    genuine_count: int
    results: List[BulkPredictionResult]


class RatingSummary(BaseModel):
    """Rating summary from product page"""
    overall_rating: Optional[float] = None
    total_ratings: Optional[int] = None
    star_distribution: Optional[dict] = None

class URLAnalysisResponse(BaseModel):
    """Response for URL analysis"""
    product_title: str
    source: str
    original_rating: Optional[float]
    real_adjusted_rating: float
    total_reviews: int
    fake_count: int
    genuine_count: int
    reviews: List[BulkPredictionResult]
    rating_summary: Optional[RatingSummary] = None
    analyzed_reviews: Optional[int] = None
    total_product_reviews: Optional[int] = None



class ModelMetrics(BaseModel):
    """Model performance metrics"""
    accuracy: float
    precision: float
    recall: float
    f1_score: float


class AllModelMetrics(BaseModel):
    """All model metrics response"""
    best_model: str
    metrics: dict
    lstm_available: bool
    lstm_metrics: Optional[dict] = None


class DashboardStats(BaseModel):
    """Dashboard statistics"""
    total_reviews: int
    fake_count: int
    genuine_count: int
    fake_percentage: float
    genuine_percentage: float
    average_confidence: float
    recent_predictions: List[dict]


class LSTMTrainingStatus(BaseModel):
    """LSTM training status"""
    is_training: bool
    is_trained: bool
    metrics: Optional[dict] = None


# Global training state
lstm_training_in_progress = False


# Helper function for indicators
def analyze_indicators(original: str, processed: str) -> list:
    """Analyze text for fake review indicators"""
    indicators = []
    
    # Check for excessive punctuation
    exclamation_count = original.count('!')
    if exclamation_count > 3:
        indicators.append({
            'type': 'excessive_punctuation',
            'description': f'High exclamation mark usage ({exclamation_count})',
            'severity': 'high' if exclamation_count > 5 else 'medium'
        })
    
    # Check for ALL CAPS words
    words = original.split()
    caps_words = [w for w in words if w.isupper() and len(w) > 2]
    if len(caps_words) > 2:
        indicators.append({
            'type': 'excessive_caps',
            'description': f'Multiple ALL CAPS words ({len(caps_words)})',
            'severity': 'high' if len(caps_words) > 4 else 'medium'
        })
    
    # Check for superlative words
    superlatives = ['best', 'amazing', 'incredible', 'perfect', 'greatest', 'wonderful', 'fantastic', 'excellent']
    found_superlatives = [w for w in processed.lower().split() if w in superlatives]
    if len(found_superlatives) > 2:
        indicators.append({
            'type': 'excessive_superlatives',
            'description': f'Multiple superlative words found: {", ".join(found_superlatives[:3])}',
            'severity': 'medium'
        })
    
    # Check for urgency phrases
    urgency_phrases = ['buy now', 'must buy', 'do not miss', 'hurry', 'limited time', 'act now']
    text_lower = original.lower()
    for phrase in urgency_phrases:
        if phrase in text_lower:
            indicators.append({
                'type': 'urgency_language',
                'description': f'Urgency phrase detected: "{phrase}"',
                'severity': 'high'
            })
            break
    
    return indicators


# API Endpoints
@api_router.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Fake Review Detection API is running", 
        "status": "healthy",
        "version": "2.0.0",
        "lstm_available": is_lstm_available()
    }


@api_router.post("/analyze", response_model=PredictionResult)
async def analyze_review(review: ReviewInput):
    """
    Analyze a review for authenticity
    
    - model: "auto" (default), "traditional" (TF-IDF + ML), "lstm" (Deep Learning)
    """
    try:
        model_choice = review.model or "auto"
        
        # Use LSTM if requested and available
        if model_choice == "lstm" and is_lstm_available() and lstm_model and lstm_model.is_trained:
            result = lstm_model.predict(review.text)
            result['processed_text'] = preprocessor.preprocess(review.text)
            result['indicators'] = analyze_indicators(review.text, result['processed_text'])
        else:
            # Use traditional ML model
            result = predictor.predict(review.text)
        
        # Create prediction record
        prediction = PredictionResult(
            original_text=review.text,
            processed_text=result['processed_text'],
            prediction=result['prediction'],
            is_fake=result['is_fake'],
            confidence=result['confidence'],
            fake_probability=result['fake_probability'],
            genuine_probability=result['genuine_probability'],
            model_used=result['model_used'],
            indicators=[Indicator(**ind) for ind in result.get('indicators', [])]
        )
        
        if ENABLE_DB and db is not None:
            # Store in MongoDB
            doc = prediction.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['indicators'] = [ind.model_dump() if hasattr(ind, 'model_dump') else ind for ind in doc['indicators']]
            try:
                await db.predictions.insert_one(doc)
            except Exception as e:
                logger.error(f"Failed to save prediction to DB: {e}")
        else:
             # Store in local memory
            doc = prediction.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['indicators'] = [ind.model_dump() if hasattr(ind, 'model_dump') else ind for ind in doc['indicators']]
            local_storage.append(doc)
        
        logger.info(f"Analyzed review: {prediction.prediction} ({prediction.confidence}%) using {result['model_used']}")
        
        return prediction
        
    except Exception as e:
        logger.error(f"Error analyzing review: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing review: {str(e)}")


@api_router.post("/analyze/bulk", response_model=BulkAnalysisResponse)
async def analyze_bulk(data: BulkAnalysisInput):
    """Analyze multiple reviews at once"""
    try:
        results = []
        fake_count = 0
        genuine_count = 0
        
        model_choice = data.model or "auto"
        use_lstm = model_choice == "lstm" and is_lstm_available() and lstm_model and lstm_model.is_trained
        
        for review_item in data.reviews:
            if use_lstm:
                result = lstm_model.predict(review_item.review_text)
            else:
                result = predictor.predict(review_item.review_text)
            
            pred_id = str(uuid.uuid4())
            
            bulk_result = BulkPredictionResult(
                id=pred_id,
                original_text=review_item.review_text,
                prediction=result['prediction'],
                is_fake=result['is_fake'],
                confidence=result['confidence'],
                model_used=result['model_used'],
                product_name=review_item.product_name,
                rating=review_item.rating
            )
            
            results.append(bulk_result)
            
            if result['is_fake']:
                fake_count += 1
            else:
                genuine_count += 1
            
            if ENABLE_DB and db is not None:
                # Store in MongoDB
                doc = {
                    'id': pred_id,
                    'original_text': review_item.review_text,
                    'processed_text': result.get('processed_text', ''),
                    'prediction': result['prediction'],
                    'is_fake': result['is_fake'],
                    'confidence': result['confidence'],
                    'fake_probability': result['fake_probability'],
                    'genuine_probability': result['genuine_probability'],
                    'model_used': result['model_used'],
                    'product_name': review_item.product_name,
                    'rating': review_item.rating,
                    'indicators': [],
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'bulk_upload': True
                }
                try:
                    await db.predictions.insert_one(doc)
                except Exception as e:
                    logger.error(f"Failed to save bulk prediction to DB: {e}")
            else:
                 # Store in local memory
                doc = {
                    'id': pred_id,
                    'original_text': review_item.review_text,
                    'processed_text': result.get('processed_text', ''),
                    'prediction': result['prediction'],
                    'is_fake': result['is_fake'],
                    'confidence': result['confidence'],
                    'fake_probability': result['fake_probability'],
                    'genuine_probability': result['genuine_probability'],
                    'model_used': result['model_used'],
                    'product_name': review_item.product_name,
                    'rating': review_item.rating,
                    'indicators': [],
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'bulk_upload': True
                }
                local_storage.append(doc)
        
        return BulkAnalysisResponse(
            total_analyzed=len(results),
            fake_count=fake_count,
            genuine_count=genuine_count,
            results=results
        )
        
    except Exception as e:
        logger.error(f"Error in bulk analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@api_router.post("/amazon-login")
async def amazon_login():
    """Open a browser window for user to sign in to Amazon.
    
    Saves session cookies to a persistent directory so the scraper
    can access all review pages without sign-in on subsequent requests.
    """
    try:
        import os
        from playwright.async_api import async_playwright
        
        browser_data_dir = os.path.join(os.path.expanduser("~"), ".fprds_browser_data")
        
        stealth_js = """
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
        """
        
        async with async_playwright() as p:
            context = await p.chromium.launch_persistent_context(
                browser_data_dir,
                headless=False,
                args=["--start-maximized", "--disable-blink-features=AutomationControlled"],
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                no_viewport=True,
                locale='en-IN',
                timezone_id='Asia/Kolkata',
            )
            await context.add_init_script(stealth_js)
            
            page = context.pages[0] if context.pages else await context.new_page()
            
            # Navigate to Amazon sign-in
            await page.goto("https://www.amazon.in/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.in%2F", timeout=30000, wait_until='domcontentloaded')
            
            logger.info("Amazon login browser opened. Waiting for sign-in...")
            
            # Wait for user to complete sign-in (up to 180 seconds)
            for i in range(180):
                await asyncio.sleep(1)
                url = page.url
                if "/ap/signin" not in url and "/ap/cvf" not in url and "/ap/mfa" not in url and "/ax/claim" not in url:
                    logger.info(f"Amazon sign-in completed after {i+1} seconds!")
                    await asyncio.sleep(2)
                    
                    # Verify login by checking for username
                    try:
                        await page.goto("https://www.amazon.in", timeout=15000, wait_until='domcontentloaded')
                        await asyncio.sleep(1)
                        name_elem = await page.query_selector('#nav-link-accountList .nav-line-1')
                        account_name = await name_elem.inner_text() if name_elem else "Unknown"
                    except:
                        account_name = "Amazon User"
                    
                    await context.close()
                    return {"status": "success", "message": f"Signed in as {account_name.strip()}", "logged_in": True}
            
            await context.close()
            return {"status": "timeout", "message": "Sign-in timed out. Please try again.", "logged_in": False}
    
    except Exception as e:
        logger.error(f"Amazon login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/amazon-login-status")
async def amazon_login_status():
    """Check if Amazon login cookies exist."""
    import os
    browser_data_dir = os.path.join(os.path.expanduser("~"), ".fprds_browser_data")
    cookies_exist = os.path.exists(browser_data_dir) and os.path.isdir(browser_data_dir)
    # Check if directory has actual cookie files
    has_data = False
    if cookies_exist:
        contents = os.listdir(browser_data_dir)
        has_data = len(contents) > 2  # More than just basic dirs
    return {"logged_in": has_data, "data_dir": browser_data_dir}


@api_router.post("/analyze/csv")
async def analyze_csv(file: UploadFile = File(...), model: str = "auto"):
    """
    Upload CSV file for bulk analysis
    Expected columns: review_text (required), product_name (optional), rating (optional)
    """
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV")
        
        # Read CSV file
        content = await file.read()
        decoded = content.decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))
        
        reviews = []
        for row in reader:
            if 'review_text' not in row:
                raise HTTPException(status_code=400, detail="CSV must have 'review_text' column")
            
            reviews.append(BulkReviewItem(
                review_text=row['review_text'],
                product_name=row.get('product_name'),
                rating=int(row['rating']) if row.get('rating') and row['rating'].isdigit() else None
            ))
        
        if len(reviews) > 1000:
            raise HTTPException(status_code=400, detail="Maximum 1000 reviews per upload")
        
        # Process using bulk endpoint
        bulk_input = BulkAnalysisInput(reviews=reviews, model=model)
        return await analyze_bulk(bulk_input)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/analyze/url", response_model=URLAnalysisResponse)
async def analyze_url(data: URLAnalysisInput):
    """
    Analyze reviews from a product URL (Amazon/Flipkart)
    """
    try:
        url = data.url
        logger.info(f"Analyzing URL: {url}")
        
        # Scrape reviews
        scraped_data = None
        
        if "amazon" in url.lower() or "amzn" in url.lower():
            scraped_data = await scraper.scrape_amazon(url)
        elif "demo" in url.lower():
            scraped_data = scraper.get_mock_data()
        else:
            raise HTTPException(
                status_code=400, 
                detail="Only Amazon product URLs are currently supported for live analysis. Try using 'demo' in the URL to see a mock analysis."
            )
        
        if not scraped_data:
            # Check if this was an Amazon URL that failed
            if "amazon" in url.lower() or "amzn" in url.lower():
                raise HTTPException(
                    status_code=500, 
                    detail="Failed to scrape reviews from Amazon. The site may be blocking the request with a CAPTCHA. Please try again later or use the 'Amazon Login' feature to bypass blocks."
                )
            else:
                raise HTTPException(
                    status_code=500, 
                    detail="Failed to fetch reviews from the provided URL."
                )
            
        reviews = []
        fake_count = 0
        genuine_count = 0
        total_rating_sum = 0
        real_rating_sum = 0
        real_review_count = 0
        
        model_choice = data.model or "auto"
        use_lstm = model_choice == "lstm" and is_lstm_available() and lstm_model and lstm_model.is_trained
        
        for item in scraped_data['reviews']:
            text = item['review_text']
            # Skip empty reviews
            if not text:
                continue
                
            if use_lstm:
                result = lstm_model.predict(text)
            else:
                result = predictor.predict(text)
            
            pred_id = str(uuid.uuid4())
            
            bulk_result = BulkPredictionResult(
                id=pred_id,
                original_text=text,
                prediction=result['prediction'],
                is_fake=result['is_fake'],
                confidence=result['confidence'],
                model_used=result['model_used'],
                product_name=scraped_data.get('product_title'),
                rating=item.get('rating'),
                author=item.get('author'),
                source=item.get('source'),
                date=item.get('date')
            )
            
            reviews.append(bulk_result)
            
            if item.get('rating'):
                total_rating_sum += item['rating']
            
            if result['is_fake']:
                fake_count += 1
            else:
                genuine_count += 1
                if item.get('rating'):
                    real_rating_sum += item['rating']
                    real_review_count += 1
                    
        # Calculate ratings
        original_rating = total_rating_sum / len(reviews) if reviews else 0
        real_adjusted_rating = real_rating_sum / real_review_count if real_review_count > 0 else 0
        
        # Build rating summary if available
        rating_summary_data = scraped_data.get('rating_summary')
        rating_summary = None
        total_product_reviews = None
        if rating_summary_data:
            rating_summary = RatingSummary(
                overall_rating=rating_summary_data.get('overall_rating'),
                total_ratings=rating_summary_data.get('total_ratings'),
                star_distribution=rating_summary_data.get('star_distribution')
            )
            total_product_reviews = rating_summary_data.get('total_ratings')
        
        return URLAnalysisResponse(
            product_title=scraped_data.get('product_title', 'Unknown Product'),
            source=scraped_data.get('reviews', [{}])[0].get('source', 'Unknown') if scraped_data.get('reviews') else 'Unknown',
            original_rating=round(original_rating, 1),
            real_adjusted_rating=round(real_adjusted_rating, 1),
            total_reviews=len(reviews),
            fake_count=fake_count,
            genuine_count=genuine_count,
            reviews=reviews,
            rating_summary=rating_summary,
            analyzed_reviews=len(reviews),
            total_product_reviews=total_product_reviews
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"Error analyzing URL: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/export/csv")
async def export_csv(limit: int = 1000):
    """Export predictions to CSV"""
    try:
        if not ENABLE_DB or db is None:
             # Use local storage
             predictions = sorted(local_storage, key=lambda x: x['created_at'], reverse=True)[:limit]
        
        output = io.StringIO()
        fieldnames = ['id', 'original_text', 'prediction', 'is_fake', 'confidence', 
                     'fake_probability', 'genuine_probability', 'model_used', 
                     'product_name', 'rating', 'created_at']
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for pred in predictions:
            writer.writerow({
                'id': pred.get('id', ''),
                'original_text': pred.get('original_text', ''),
                'prediction': pred.get('prediction', ''),
                'is_fake': pred.get('is_fake', ''),
                'confidence': pred.get('confidence', ''),
                'fake_probability': pred.get('fake_probability', ''),
                'genuine_probability': pred.get('genuine_probability', ''),
                'model_used': pred.get('model_used', ''),
                'product_name': pred.get('product_name', ''),
                'rating': pred.get('rating', ''),
                'created_at': pred.get('created_at', '')
            })
        
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=predictions_export.csv"}
        )
        
    except Exception as e:
        logger.error(f"Error exporting CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/export/json")
async def export_json(limit: int = 1000):
    """Export predictions to JSON"""
    try:
        if not ENABLE_DB or db is None:
             # Use local storage
             predictions = sorted(local_storage, key=lambda x: x['created_at'], reverse=True)[:limit]
        
        # Convert to JSON string
        json_data = json.dumps(predictions, indent=2, default=str)
        
        return StreamingResponse(
            iter([json_data]),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=predictions_export.json"}
        )
        
    except Exception as e:
        logger.error(f"Error exporting JSON: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/predictions", response_model=List[PredictionResult])
async def get_predictions(limit: int = 100, skip: int = 0):
    """Get prediction history"""
    try:
        if not ENABLE_DB or db is None:
            # Use local storage
            start_index = skip
            end_index = skip + limit
            return sorted(local_storage, key=lambda x: x['created_at'], reverse=True)[start_index:end_index]

        predictions = await db.predictions.find(
            {}, 
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        for pred in predictions:
            if isinstance(pred.get('created_at'), str):
                pred['created_at'] = datetime.fromisoformat(pred['created_at'].replace('Z', '+00:00'))
            if 'indicators' not in pred:
                pred['indicators'] = []
        
        return predictions
    except Exception as e:
        logger.error(f"Error fetching predictions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/predictions/{prediction_id}", response_model=PredictionResult)
async def get_prediction(prediction_id: str):
    """Get a specific prediction by ID"""
    try:
        if not ENABLE_DB or db is None:
             # Use local storage
             prediction = next((p for p in local_storage if p['id'] == prediction_id), None)
        else:
            prediction = await db.predictions.find_one(
                {"id": prediction_id},
                {"_id": 0}
            )
        
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction not found")
        
        if isinstance(prediction.get('created_at'), str):
            prediction['created_at'] = datetime.fromisoformat(prediction['created_at'].replace('Z', '+00:00'))
        if 'indicators' not in prediction:
            prediction['indicators'] = []
        
        return prediction
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/predictions/{prediction_id}")
async def delete_prediction(prediction_id: str):
    """Delete a prediction by ID"""
    try:
        if not ENABLE_DB or db is None:
             # Use local storage
             initial_len = len(local_storage)
             # Remove item from list (need to modify global list)
             for i, p in enumerate(local_storage):
                if p['id'] == prediction_id:
                    del local_storage[i]
                    break
             
             if len(local_storage) == initial_len:
                 raise HTTPException(status_code=404, detail="Prediction not found")
             
             return {"message": "Prediction deleted successfully"}

        result = await db.predictions.delete_one({"id": prediction_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Prediction not found")
        
        return {"message": "Prediction deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/metrics", response_model=AllModelMetrics)
async def get_model_metrics():
    """Get performance metrics of all trained models"""
    try:
        metrics = predictor.get_model_metrics()
        
        lstm_metrics = None
        if is_lstm_available() and lstm_model and lstm_model.is_trained:
            lstm_metrics = lstm_model.get_metrics()
        
        return AllModelMetrics(
            best_model=metrics['best_model'],
            metrics=metrics['metrics'],
            lstm_available=is_lstm_available(),
            lstm_metrics=lstm_metrics
        )
    except Exception as e:
        logger.error(f"Error fetching metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        if not ENABLE_DB or db is None:
            # Calculate stats from local storage
            total_reviews = len(local_storage)
            fake_count = sum(1 for p in local_storage if p.get('is_fake', False))
            genuine_count = sum(1 for p in local_storage if not p.get('is_fake', False))
            
            fake_percentage = (fake_count / total_reviews * 100) if total_reviews > 0 else 0
            genuine_percentage = (genuine_count / total_reviews * 100) if total_reviews > 0 else 0
            
            avg_confidence = 0
            if total_reviews > 0:
                avg_confidence = sum(p.get('confidence', 0) for p in local_storage) / total_reviews
                
            recent = sorted(local_storage, key=lambda x: x['created_at'], reverse=True)[:5]
            
            return DashboardStats(
                total_reviews=total_reviews,
                fake_count=fake_count,
                genuine_count=genuine_count,
                fake_percentage=round(fake_percentage, 2),
                genuine_percentage=round(genuine_percentage, 2),
                average_confidence=round(avg_confidence, 2),
                recent_predictions=recent
            )

        total_reviews = await db.predictions.count_documents({})
        fake_count = await db.predictions.count_documents({"is_fake": True})
        genuine_count = await db.predictions.count_documents({"is_fake": False})
        
        fake_percentage = (fake_count / total_reviews * 100) if total_reviews > 0 else 0
        genuine_percentage = (genuine_count / total_reviews * 100) if total_reviews > 0 else 0
        
        pipeline = [
            {"$group": {"_id": None, "avg_confidence": {"$avg": "$confidence"}}}
        ]
        avg_result = await db.predictions.aggregate(pipeline).to_list(1)
        avg_confidence = avg_result[0]["avg_confidence"] if avg_result else 0
        
        recent = await db.predictions.find(
            {},
            {"_id": 0, "id": 1, "prediction": 1, "confidence": 1, "created_at": 1, "model_used": 1}
        ).sort("created_at", -1).limit(5).to_list(5)
        
        for pred in recent:
            if isinstance(pred.get('created_at'), str):
                pred['created_at'] = pred['created_at']
            elif hasattr(pred.get('created_at'), 'isoformat'):
                pred['created_at'] = pred['created_at'].isoformat()
        
        return DashboardStats(
            total_reviews=total_reviews,
            fake_count=fake_count,
            genuine_count=genuine_count,
            fake_percentage=round(fake_percentage, 2),
            genuine_percentage=round(genuine_percentage, 2),
            average_confidence=round(avg_confidence, 2) if avg_confidence else 0,
            recent_predictions=recent
        )
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/retrain")
async def retrain_models():
    """Retrain ML models with enhanced dataset"""
    try:
        # Get enhanced training data
        texts, labels, metadata = dataset_manager.get_training_data()
        
        # Retrain traditional models
        result = predictor.retrain(texts=texts, labels=labels)
        
        return {
            "message": "Models retrained successfully",
            "details": result,
            "dataset_stats": dataset_manager.get_dataset_stats()
        }
    except Exception as e:
        logger.error(f"Error retraining models: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/lstm/status", response_model=LSTMTrainingStatus)
async def get_lstm_status():
    """Get LSTM model status"""
    global lstm_training_in_progress
    
    is_trained = lstm_model.is_trained if lstm_model else False
    metrics = lstm_model.get_metrics() if lstm_model and is_trained else None
    
    return LSTMTrainingStatus(
        is_training=lstm_training_in_progress,
        is_trained=is_trained,
        metrics=metrics
    )


@api_router.post("/lstm/train")
async def train_lstm(background_tasks: BackgroundTasks):
    """Train LSTM model (runs in background)"""
    global lstm_training_in_progress
    
    if not is_lstm_available():
        raise HTTPException(status_code=400, detail="LSTM not available. TensorFlow required.")
    
    if lstm_training_in_progress:
        raise HTTPException(status_code=400, detail="LSTM training already in progress")
    
    def train_lstm_background():
        global lstm_training_in_progress
        try:
            lstm_training_in_progress = True
            texts, labels, _ = dataset_manager.get_training_data()
            lstm_model.train(texts, labels, epochs=10)
        except Exception as e:
            logger.error(f"LSTM training error: {e}")
        finally:
            lstm_training_in_progress = False
    
    background_tasks.add_task(train_lstm_background)
    
    return {"message": "LSTM training started in background"}


@api_router.get("/dataset/stats")
async def get_dataset_stats():
    """Get training dataset statistics"""
    try:
        stats = dataset_manager.get_dataset_stats()
        return stats
    except Exception as e:
        logger.error(f"Error getting dataset stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Include the router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    logger.info("Fake Review Detection API v2.0 starting up...")
    import asyncio
    try:
        loop = asyncio.get_running_loop()
        logger.info(f"Startup: Loop type: {type(loop)}")
        policy = asyncio.get_event_loop_policy()
        logger.info(f"Startup: Policy type: {type(policy)}")
    except Exception as e:
        logger.error(f"Failed to check loop type: {e}")

    if not predictor.is_loaded:

        predictor._initialize()
    logger.info(f"ML models loaded. LSTM available: {is_lstm_available()}")


@app.on_event("shutdown")
async def shutdown_db_client():
    """Cleanup on shutdown"""
    if 'client' in globals() and client:
        client.close()
        logger.info("Database connection closed")
