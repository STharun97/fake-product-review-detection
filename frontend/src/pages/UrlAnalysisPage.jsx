import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { AlertCircle, AlertTriangle, CheckCircle, Search, ShoppingBag, Star, TrendingUp, LogIn, Loader2, Link2, Sparkles, ShieldAlert, ArrowRight } from 'lucide-react';
import { toast } from "sonner";

const UrlAnalysisPage = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [amazonLoggedIn, setAmazonLoggedIn] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);

    // Check Amazon login status on mount
    useEffect(() => {
        fetch('http://localhost:8002/api/amazon-login-status')
            .then(res => res.json())
            .then(data => setAmazonLoggedIn(data.logged_in))
            .catch(() => { });
    }, []);

    const handleAmazonLogin = async () => {
        setLoginLoading(true);
        toast.info("Opening Amazon sign-in browser. Please sign in...");
        try {
            const res = await fetch('http://localhost:8002/api/amazon-login', { method: 'POST' });
            const data = await res.json();
            if (data.logged_in) {
                setAmazonLoggedIn(true);
                toast.success(data.message);
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error("Login failed. Please try again.");
        } finally {
            setLoginLoading(false);
        }
    };

    const handleAnalyze = async (e) => {
        e.preventDefault();
        if (!url) return;

        setLoading(true);
        try {
            const response = await fetch('http://localhost:8002/api/analyze/url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            const data = await response.json();
            setResult(data);
            toast.success("Analysis complete!");
        } catch (error) {
            console.error('Error:', error);
            toast.error("Failed to analyze URL. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] bg-gray-50/30 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-900/5 rounded-full blur-[100px] -z-10" />
            <div className="absolute top-40 left-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px] -z-10" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
                
                <div className="flex flex-col gap-3 mb-10 text-center md:text-left">
                    <Badge variant="secondary" className="w-fit mx-auto md:mx-0 bg-blue-50 text-blue-800 border-0 mb-2 px-3 py-1">
                        <Link2 className="w-3.5 h-3.5 mr-2 inline-block" /> URL Scanner
                    </Badge>
                    <h1 className="font-heading text-4xl font-extrabold tracking-tight text-gray-900">
                        Product URL <span className="text-blue-800">Analysis</span>
                    </h1>
                    <p className="text-lg text-gray-500 max-w-2xl font-medium">
                        Analyze product reviews directly from Amazon to reveal the true, adjusted rating.
                    </p>
                </div>

                {/* Amazon Login Banner */}
                {!amazonLoggedIn ? (
                    <div className="card-modern mb-8 p-1 overflow-hidden bg-gradient-to-r from-blue-50 via-blue-100 to-cyan-50">
                        <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 border border-white">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/30 flex-shrink-0">
                                    <LogIn className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 font-heading">Connect Amazon Account</h3>
                                    <p className="text-sm font-medium text-gray-600 mt-1 max-w-xl">
                                        Without signing in, we can only fetch ~8 reviews. Sign in securely once to unlock full deep-scan for all product reviews.
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={handleAmazonLogin}
                                disabled={loginLoading}
                                className="btn-premium bg-blue-800 hover:bg-blue-900 text-white min-w-[160px] whitespace-nowrap"
                            >
                                {loginLoading ? (
                                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Connecting...</>
                                ) : (
                                    <><LogIn className="h-4 w-4 mr-2" /> Sign in to Amazon</>
                                )}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 text-sm font-medium text-green-700 bg-green-50/80 backdrop-blur-sm px-6 py-4 rounded-2xl border border-green-100 mb-8 shadow-sm w-fit">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <span>Amazon session active — Full deep-scan enabled</span>
                    </div>
                )}

                {/* Input Card */}
                <div className="card-modern p-6 md:p-8 mb-10 bg-white border-0 shadow-lg shadow-gray-200/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-800 to-cyan-500" />
                    
                    <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-4 items-center relative z-10 w-full">
                        <div className="flex-1 w-full relative group">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-800 transition-colors" strokeWidth={2.5} />
                            </div>
                            <Input
                                placeholder="Paste Amazon product URL..."
                                className="input-modern !pl-16 h-14 w-full text-base"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <Button 
                            type="submit" 
                            disabled={loading || !url}
                            className="btn-premium h-14 px-8 bg-gray-900 hover:bg-black text-white text-base w-full md:w-auto flex-shrink-0"
                        >
                            {loading ? (
                                <><Loader2 className="h-5 w-5 animate-spin mr-3" strokeWidth={2.5} /> Extracting & Analyzing...</>
                            ) : (
                                <><Sparkles className="h-5 w-5 mr-3 text-cyan-400" strokeWidth={2.5} /> Analyze Product</>
                            )}
                        </Button>
                    </form>
                    
                    <div className="mt-4 flex items-start gap-2 text-xs font-medium text-gray-400">
                        <ShieldAlert className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p>
                            {amazonLoggedIn
                                ? "A background browser will open to execute deep-scraping. It may take 1-3 minutes to compile all reviews."
                                : "Basic mode active: Analyzes top reviews visible on the product homepage."}
                        </p>
                    </div>
                </div>

                {/* Results Section */}
                {result && (
                    <div className="space-y-8">
                        
                        {/* Summary Bento Grid */}
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            
                            {/* Original Rating */}
                            <div className="card-modern bg-white p-6 border-0">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                                        {result.rating_summary?.overall_rating ? "Displayed Rating" : "Original Rating"}
                                    </h3>
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                                        <Star className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="text-4xl font-black text-gray-900 mb-2">
                                    {result.rating_summary?.overall_rating || result.original_rating} <span className="text-xl text-gray-400 font-medium">/ 5.0</span>
                                </div>
                                <p className="text-sm font-medium text-blue-800 bg-blue-50 px-3 py-1 rounded-md w-fit">
                                    {result.rating_summary?.total_ratings
                                        ? `${result.rating_summary.total_ratings.toLocaleString()} visible ratings`
                                        : `${result.total_reviews} analyzed reviews`}
                                </p>
                            </div>

                            {/* Real Adjusted Rating (Highlight) */}
                            <div className={`card-modern p-6 border-0 bg-gradient-to-br text-white shadow-lg ${result.real_adjusted_rating < result.original_rating ? 'from-red-600 to-red-700 shadow-red-900/20' : 'from-green-600 to-green-700 shadow-green-900/20'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-white/90 uppercase tracking-wider">Real Rating</h3>
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                                        <TrendingUp className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="text-4xl font-black mb-2 flex items-baseline gap-1">
                                    {result.real_adjusted_rating} <span className="text-xl font-semibold opacity-70">/ 5.0</span>
                                </div>
                                <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg w-fit">
                                    <p className="text-sm font-bold text-white flex items-center gap-1.5">
                                        {result.real_adjusted_rating < result.original_rating ? (
                                            <><AlertTriangle className="w-4 h-4" /> Rating Dropped By {(result.original_rating - result.real_adjusted_rating).toFixed(1)}</>
                                        ) : (
                                            <><CheckCircle className="w-4 h-4" /> Verified Authentic Score</>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Fake Count */}
                            <div className="card-modern bg-white p-6 border-0">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Fake Reviews</h3>
                                    <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                                        <AlertCircle className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="text-4xl font-black text-red-600 mb-2">{result.fake_count}</div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2 mt-4">
                                    <div className="bg-red-600 h-1.5 rounded-full" style={{ width: `${result.total_reviews > 0 ? (result.fake_count / result.total_reviews) * 100 : 0}%` }} />
                                </div>
                                <p className="text-xs font-bold text-gray-400">
                                    {result.total_reviews > 0 ? ((result.fake_count / result.total_reviews) * 100).toFixed(1) : 0}% of analyzed sample
                                </p>
                            </div>

                            {/* Product Info */}
                            <div className="card-modern bg-white p-6 border-0 relative overflow-hidden">
                                <div className="absolute -right-4 -bottom-4 opacity-5">
                                    <ShoppingBag className="w-32 h-32" />
                                </div>
                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Product Match</h3>
                                </div>
                                <div className="text-sm font-bold text-gray-900 line-clamp-2 mb-3 relative z-10 hidden sm:block" title={result.product_title}>
                                    {result.product_title}
                                </div>
                                <div className="flex flex-col gap-2 relative z-10">
                                    <Badge variant="outline" className="w-fit border-gray-200 text-gray-600 bg-gray-50">
                                        {result.source.toUpperCase()}
                                    </Badge>
                                    {result.total_product_reviews && (
                                        <p className="text-xs font-medium text-blue-800 bg-blue-50 px-2 py-1 rounded w-fit mt-1">
                                            Sample: {result.analyzed_reviews} / {result.total_product_reviews.toLocaleString()} overall
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Distribution and Tabs Container */}
                        <div className="grid lg:grid-cols-4 gap-8">
                            
                            {/* Star Distribution Column */}
                            <div className="lg:col-span-1 space-y-6">
                                {result.rating_summary?.star_distribution && Object.keys(result.rating_summary.star_distribution).length > 0 && (
                                    <div className="card-modern p-6 bg-white border-0 sticky top-24">
                                        <h3 className="font-heading text-lg font-bold text-gray-900 mb-1">Breakdown</h3>
                                        <p className="text-xs font-medium text-gray-400 mb-6">Original Displayed Distribution</p>
                                        
                                        <div className="space-y-4">
                                            {[5, 4, 3, 2, 1].map((star) => {
                                                const pct = result.rating_summary.star_distribution[String(star)] || 0;
                                                return (
                                                    <div key={star} className="flex items-center gap-3">
                                                        <span className="w-4 text-sm font-bold text-gray-600">{star}</span>
                                                        <Star className={`w-3 h-3 ${star >= 4 ? 'text-green-600 fill-green-600' : star === 3 ? 'text-amber-500 fill-amber-500' : 'text-red-600 fill-red-600'}`} />
                                                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-1000 ${star >= 4 ? 'bg-green-600' : star === 3 ? 'bg-amber-400' : 'bg-red-600'}`}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                        <span className="w-8 text-right text-xs font-bold text-gray-500">{pct}%</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Review Tabs Column */}
                            <div className="lg:col-span-3">
                                <Tabs defaultValue="all" className="w-full">
                                    <TabsList className="bg-white p-1 pb-1 mb-6 rounded-xl border border-gray-100 shadow-sm w-full sm:w-auto overflow-x-auto justify-start inline-flex">
                                        <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-gray-100 data-[state=active]:shadow-none font-bold">
                                            All Scraped ({result.total_reviews})
                                        </TabsTrigger>
                                        <TabsTrigger value="fake" className="rounded-lg data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:shadow-none font-bold text-red-600">
                                            Fake ({result.fake_count})
                                        </TabsTrigger>
                                        <TabsTrigger value="genuine" className="rounded-lg data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:shadow-none font-bold text-green-600">
                                            Genuine ({result.genuine_count})
                                        </TabsTrigger>
                                    </TabsList>

                                    {/* Tab Contents */}
                                    <TabsContent value="all" className="space-y-4 m-0 focus-visible:ring-0">
                                        {result.reviews.map((review) => (
                                            <ReviewCard key={review.id} review={review} />
                                        ))}
                                    </TabsContent>

                                    <TabsContent value="fake" className="space-y-4 m-0 focus-visible:ring-0">
                                        {result.reviews.filter(r => r.is_fake).map((review) => (
                                            <ReviewCard key={review.id} review={review} />
                                        ))}
                                        {result.fake_count === 0 && (
                                            <div className="card-modern p-10 text-center bg-gray-50 border-dashed">
                                                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                                                <h3 className="text-lg font-bold text-gray-700">No Fake Reviews Detected</h3>
                                                <p className="text-gray-500 text-sm mt-1">This product sample looks completely clean.</p>
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="genuine" className="space-y-4 m-0 focus-visible:ring-0">
                                        {result.reviews.filter(r => !r.is_fake).map((review) => (
                                            <ReviewCard key={review.id} review={review} />
                                        ))}
                                    </TabsContent>
                                </Tabs>
                            </div>
                            
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Extracted and modernized ReviewCard
const ReviewCard = ({ review }) => {
    return (
        <div className={`card-modern bg-white p-5 border-0 transition-all relative overflow-hidden ${review.is_fake ? 'ring-1 ring-red-200' : ''}`}>
            {resultBg(review.is_fake)}
            
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex flex-col gap-2">
                    <Badge className={`w-fit font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 border-0 ${
                        review.is_fake ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}>
                        {review.is_fake ? "Detected Fake" : "Genuine User"}
                    </Badge>
                    {review.rating && (
                        <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`h-3 w-3 ${i < review.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                            ))}
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-0.5">Confidence</span>
                    <span className={`text-sm font-black ${review.is_fake ? 'text-red-600' : 'text-green-600'}`}>
                        {review.confidence.toFixed(1)}%
                    </span>
                </div>
            </div>
            
            <div className="relative z-10">
                <p className="text-[15px] font-body text-gray-700 leading-relaxed">
                    "{review.original_text}"
                </p>
            </div>
            
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-gray-400 pt-3 border-t border-gray-100 relative z-10">
                <span className="text-gray-600">
                    <b className="font-bold">Author:</b> {review.author || "Anonymous"}
                </span>
                {review.date && (
                    <span><b className="font-bold">Date:</b> {review.date}</span>
                )}
                {review.source && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase">{review.source}</span>
                )}
                <span className="ml-auto text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    <b className="font-bold">Model:</b> {review.model_used}
                </span>
            </div>
        </div>
    );
};

const resultBg = (isFake) => {
    if (isFake) {
        return <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-[100px] -z-0 opacity-50 pointer-events-none" />;
    }
    return <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-[100px] -z-0 opacity-50 pointer-events-none" />;
}

export default UrlAnalysisPage;
