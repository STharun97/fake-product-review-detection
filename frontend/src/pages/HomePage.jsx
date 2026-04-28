import { useState } from "react";
import { Search, AlertTriangle, CheckCircle, Loader2, Sparkles, Info, ShieldCheck, ArrowRight, Zap, Target } from "lucide-react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import axios from "axios";

const API_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8002') + '/api';

const HomePage = () => {
  const [reviewText, setReviewText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!reviewText.trim() || reviewText.trim().length < 5) {
      toast.error("Please enter a review with at least 5 characters");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const response = await axios.post(`${API_URL}/analyze`, {
        text: reviewText,
      });
      setResult(response.data);
      toast.success(`Analysis complete: ${response.data.prediction}`);
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(error.response?.data?.detail || "Failed to analyze review");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sampleReviews = [
    {
      label: "Likely Genuine",
      text: "I bought this phone case last month and it's been holding up well. The fit is snug and the buttons are easy to press. Only minor complaint is the color is slightly different from the photos.",
    },
    {
      label: "Likely Fake",
      text: "AMAZING!!! BEST PRODUCT EVER!!! Everyone MUST buy this!!! Changed my life completely!!! 5 STARS is not enough!!! BUY NOW!!!",
    },
  ];

  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden">
      {/* Background decoration elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-400/10 rounded-full blur-[80px] -z-10 mix-blend-multiply" />
      <div className="absolute top-40 right-10 w-96 h-96 bg-violet-400/10 rounded-full blur-[100px] -z-10 mix-blend-multiply" />
      <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-fuchsia-400/10 rounded-full blur-[100px] -z-10 mix-blend-multiply" />

      <div className="relative z-10 px-4 pt-12 pb-24 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        
        {/* Hero Section */}
        <div className="text-center mb-16" data-testid="hero-section">
          <Badge variant="secondary" className="mb-6 py-1.5 px-4 bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100 rounded-full transition-all">
            <Sparkles className="w-3.5 h-3.5 mr-2 inline-block text-blue-500" />
            Next Generation Review Analysis
          </Badge>
          <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 drop-shadow-sm">
            Detect <span className="text-blue-800">Fake Reviews</span>
            <br />With <span className="text-cyan-600">Precision</span>
          </h1>
          <p className="font-body text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Our professional ML engine analyzes linguistic patterns, sentiment, and metadata to instantly flag inauthentic product reviews.
          </p>

          {/* Value props */}
          <div className="flex flex-wrap justify-center gap-6 mt-10">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
              <Zap className="w-4 h-4 text-amber-500" /> Lightning Fast
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
              <Target className="w-4 h-4 text-green-500" /> 98% Accuracy
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-blue-700" /> NLP Powered
            </div>
          </div>
        </div>

        {/* Main Analysis Section */}
        <section data-testid="analysis-section" className="relative">
          
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-800 to-cyan-500 rounded-[2rem] blur opacity-10" />
          
          {/* Input Card */}
          <div className="relative card-modern p-6 md:p-8 mb-10 bg-white/90 backdrop-blur-xl border border-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
                <Search className="w-5 h-5" strokeWidth={2} />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-gray-900">
                  Analyze Review Text
                </h2>
                <p className="text-sm text-gray-500 font-medium">Paste the exact review content below to check authenticity.</p>
              </div>
            </div>
            
            <Textarea
              data-testid="review-input"
              placeholder="E.g., 'This product completely changed my life! I've bought 10 of them! Best ever!!!'"
              className="input-modern min-h-[160px] text-base resize-none w-full mb-6"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
            />
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="text-sm font-medium text-gray-400 flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                <Info className="w-4 h-4" />
                {reviewText.length} characters <span className="text-gray-300 mx-1">|</span> Min 5 required
              </div>
              <Button
                data-testid="analyze-button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || reviewText.length < 5}
                className="btn-premium bg-blue-800 hover:bg-blue-900 text-white font-heading text-sm px-8 py-6 shadow-blue-900/20 shadow-lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing Content...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-3 text-cyan-400" strokeWidth={2.5} />
                    Run Analysis
                    <ArrowRight className="w-4 h-4 ml-2 opacity-70" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Result Card */}
          {result && (
            <div 
              className="card-modern p-6 md:p-8 bg-white/95 backdrop-blur-xl"
              data-testid="result-card"
            >
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${result.is_fake ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                  {result.is_fake ? (
                    <AlertTriangle className="w-6 h-6" strokeWidth={2} />
                  ) : (
                    <CheckCircle className="w-6 h-6" strokeWidth={2} />
                  )}
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-gray-900">
                    Analysis Results
                  </h2>
                  <p className="text-sm text-gray-500 font-medium">Model: {result.model_used?.replace('_', ' ').toUpperCase()}</p>
                </div>
              </div>

              {/* Main Result */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-10 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Verdict</p>
                  <Badge
                    data-testid="prediction-badge"
                    className={`
                      text-xl px-6 py-2.5 font-heading tracking-wide shadow-sm
                      ${result.is_fake ? "badge-fake" : "badge-genuine"}
                    `}
                  >
                    {result.prediction}
                  </Badge>
                </div>
                
                {/* Confidence Meter */}
                <div className="w-full md:w-72" data-testid="confidence-meter">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                      Confidence Score
                    </span>
                    <span className={`font-heading text-3xl font-bold ${result.is_fake ? "text-red-700" : "text-green-700"}`}>
                      {result.confidence}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200/60 rounded-full overflow-hidden backdrop-blur-sm shadow-inner">
                    <div
                      className={`h-full animate-fill-meter rounded-full shadow-sm ${
                        result.is_fake ? "bg-red-600" : "bg-green-600"
                      }`}
                      style={{ width: `${result.confidence}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Probability Bars */}
              <div className="grid md:grid-cols-2 gap-6 mb-10">
                <div data-testid="genuine-probability" className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-gray-600">
                      Genuine Probability
                    </span>
                    <span className="text-lg font-black text-green-700 bg-green-50 px-2 py-0.5 rounded-md">
                      {result.genuine_probability}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-600 rounded-full"
                      style={{ width: `${result.genuine_probability}%` }}
                    />
                  </div>
                </div>

                <div data-testid="fake-probability" className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-gray-600">
                      Fake Probability
                    </span>
                    <span className="text-lg font-black text-red-700 bg-red-50 px-2 py-0.5 rounded-md">
                      {result.fake_probability}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 rounded-full"
                      style={{ width: `${result.fake_probability}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Indicators */}
              {result.indicators && result.indicators.length > 0 && (
                <div data-testid="indicators-section" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="bg-gray-50/80 px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h3 className="font-heading text-sm font-bold text-gray-700">
                      Detected Linguistic Indicators
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {result.indicators.map((indicator, index) => (
                      <div
                        key={index}
                        className={`
                          flex items-start gap-3 p-4 transition-colors hover:bg-gray-50/50
                          ${indicator.severity === 'high' ? 'border-l-4 border-l-red-600' : 
                            indicator.severity === 'medium' ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-cyan-500'}
                        `}
                      >
                        <div className={`mt-0.5 p-1 rounded-md ${
                          indicator.severity === 'high' ? 'bg-red-100 text-red-600' : 
                          indicator.severity === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-cyan-100 text-cyan-600'
                        }`}>
                          <AlertTriangle className="w-4 h-4" strokeWidth={2} />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2">
                          <span className="text-sm font-medium text-gray-800">
                            {indicator.description}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] uppercase font-bold self-start sm:self-auto ${
                              indicator.severity === 'high' ? 'text-red-700 border-red-200' : 
                              indicator.severity === 'medium' ? 'text-amber-700 border-amber-200' : 'text-cyan-700 border-cyan-200'
                            }`}
                          >
                            {indicator.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.indicators && result.indicators.length === 0 && (
                <div className="text-center py-6 bg-green-50/50 border border-green-100 rounded-xl" data-testid="no-indicators">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-700">No suspicious linguistic patterns detected</p>
                </div>
              )}
            </div>
          )}

          {/* Sample Reviews */}
          <div className="mt-16" data-testid="sample-reviews">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px bg-gray-200 flex-1 max-w-[100px]" />
              <h3 className="font-heading text-sm font-bold uppercase tracking-widest text-gray-400">
                Try Sample Reviews
              </h3>
              <div className="h-px bg-gray-200 flex-1 max-w-[100px]" />
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {sampleReviews.map((sample, index) => (
                <button
                  key={index}
                  data-testid={`sample-review-${index}`}
                  onClick={() => setReviewText(sample.text)}
                  className="card-modern p-6 text-left group bg-white/80 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Badge 
                      className={`text-xs font-bold px-3 py-1 ${
                        sample.label.includes('Fake') 
                          ? 'bg-red-50 text-red-700 border border-red-100 group-hover:bg-red-100' 
                          : 'bg-green-50 text-green-700 border border-green-100 group-hover:bg-green-100'
                      }`}
                    >
                      {sample.label}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <p className="font-body text-sm text-gray-600 line-clamp-3 group-hover:text-gray-900 transition-colors leading-relaxed">
                    "{sample.text}"
                  </p>
                </button>
              ))}
            </div>
          </div>
          
        </section>
      </div>
    </div>
  );
};

export default HomePage;
