import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle, Loader2, RefreshCw, Cpu, Activity, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import axios from "axios";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const API_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8002') + '/api';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, metricsRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/stats`),
        axios.get(`${API_URL}/metrics`),
      ]);
      setStats(statsRes.data);
      setMetrics(metricsRes.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      await axios.post(`${API_URL}/retrain`);
      toast.success("Models retrained successfully");
      fetchData();
    } catch (error) {
      console.error("Error retraining:", error);
      toast.error("Failed to retrain models");
    } finally {
      setRetraining(false);
    }
  };

  const pieData = stats ? [
    { name: "Genuine", value: stats.genuine_count, color: "#16A34A" },
    { name: "Fake", value: stats.fake_count, color: "#DC2626" },
  ] : [];

  const modelMetricsData = metrics?.metrics ? Object.entries(metrics.metrics).map(([name, data]) => ({
    name: name.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    accuracy: Math.round(data.accuracy * 100),
    precision: Math.round(data.precision * 100),
    recall: Math.round(data.recall * 100),
    f1: Math.round(data.f1_score * 100),
  })) : [];

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50/50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-800" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/30 relative overflow-hidden">
      {/* Background Decorative Blur */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-900/5 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px] -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-blue-800">
              <Activity className="w-6 h-6" strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-extrabold tracking-tight text-gray-900">
                System Intelligence
              </h1>
              <p className="text-sm font-medium text-gray-500 mt-1">
                Real-time performance metrics and ML model analytics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={fetchData}
              variant="outline"
              className="rounded-xl border-gray-200 hover:bg-gray-50 hover:text-blue-800 transition-colors bg-white shadow-sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" strokeWidth={2} />
              Refresh Data
            </Button>
            <Button
              onClick={handleRetrain}
              disabled={retraining}
              className="bg-blue-800 hover:bg-blue-900 text-white rounded-xl shadow-md transition-all shadow-blue-900/20"
            >
              {retraining ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Cpu className="w-4 h-4 mr-2" strokeWidth={2} />
              )}
              Retrain Models
            </Button>
          </div>
        </div>

        {/* Bento Grid Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          
          {/* Total Reviews Card */}
          <div className="card-modern p-6 bg-gradient-to-br from-blue-800 to-blue-900 text-white border-0 shadow-lg shadow-blue-900/20 transform transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-wider font-bold text-indigo-100">Total Analyzed</span>
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="font-heading text-5xl font-black mb-1">{stats?.total_reviews || 0}</p>
            <p className="text-sm font-medium text-blue-100 mt-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Platform lifetime reviews
            </p>
          </div>

          {/* Genuine Count */}
          <div className="card-modern p-6 border-green-100/50 bg-gradient-to-br from-white to-green-50/30">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-wider font-bold text-gray-500">Genuine Reviews</span>
              <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <CheckCircle className="w-5 h-5" strokeWidth={2} />
              </div>
            </div>
            <p className="font-heading text-4xl font-black text-gray-900">
              {stats?.genuine_count || 0}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-0">{stats?.genuine_percentage || 0}%</Badge>
              <span className="text-xs text-gray-400 font-medium">of total</span>
            </div>
          </div>

          {/* Fake Count */}
          <div className="card-modern p-6 border-red-100/50 bg-gradient-to-br from-white to-red-50/30">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-wider font-bold text-gray-500">Fake Reviews</span>
              <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                <AlertTriangle className="w-5 h-5" strokeWidth={2} />
              </div>
            </div>
            <p className="font-heading text-4xl font-black text-gray-900">
              {stats?.fake_count || 0}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0">{stats?.fake_percentage || 0}%</Badge>
              <span className="text-xs text-gray-400 font-medium">of total</span>
            </div>
          </div>

          {/* Average Confidence */}
          <div className="card-modern p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-wider font-bold text-gray-500">Model Confidence</span>
              <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                <BarChart3 className="w-5 h-5" strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <p className="font-heading text-4xl font-black text-gray-900">{stats?.average_confidence || 0}</p>
              <span className="text-2xl font-bold text-gray-400 mb-1">%</span>
            </div>
            <Progress value={stats?.average_confidence} className="h-1.5 mt-4" />
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          
          {/* Distribution Pie Chart */}
          <div className="card-modern p-6 lg:col-span-1">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                <PieChart className="w-4 h-4 text-gray-500" />
              </div>
              <h2 className="font-heading text-sm uppercase tracking-wider font-bold text-gray-800">
                Distribution
              </h2>
            </div>
            {stats?.total_reviews > 0 ? (
              <div className="h-64 flex flex-col justify-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-600" />
                    <span className="text-sm font-medium text-gray-600">Genuine</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-600" />
                    <span className="text-sm font-medium text-gray-600">Fake</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400 font-medium bg-gray-50/50 rounded-xl">
                No data available
              </div>
            )}
          </div>

          {/* Model Performance */}
          <div className="card-modern p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-800" />
                </div>
                <h2 className="font-heading text-sm uppercase tracking-wider font-bold text-gray-800">
                  Model Accuracy (F1 Score)
                </h2>
              </div>
              {metrics?.best_model && (
                <Badge className="bg-blue-50 text-blue-800 hover:bg-blue-100 border-0 font-bold px-3 py-1 text-xs">
                  ★ Best: {metrics.best_model.replace('_', ' ')}
                </Badge>
              )}
            </div>
            
            {modelMetricsData.length > 0 ? (
              <div className="h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelMetricsData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={120} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#4b5563', fontSize: 13, fontWeight: 500 }} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#f3f4f6' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar 
                      dataKey="f1" 
                      name="F1 Score" 
                      radius={[0, 6, 6, 0]}
                      barSize={24}
                    >
                      {modelMetricsData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={metrics?.best_model?.replace('_', ' ').toLowerCase() === entry.name.toLowerCase() ? '#1E3A8A' : '#BFDBFE'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400 font-medium bg-gray-50/50 rounded-xl">
                No metrics available
              </div>
            )}
          </div>
        </div>

        {/* Detailed Metrics Layout */}
        {modelMetricsData.length > 0 && (
          <div className="mb-10">
            <h2 className="font-heading text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              Deep Dive Analytics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modelMetricsData.map((model) => {
                const isBest = metrics?.best_model?.replace('_', ' ').toLowerCase() === model.name.toLowerCase();
                return (
                  <div 
                    key={model.name} 
                    className={`card-modern p-6 transition-all duration-300 ${
                      isBest ? 'ring-2 ring-blue-800 shadow-lg shadow-blue-900/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-heading text-lg font-bold text-gray-900">
                        {model.name}
                      </h3>
                      {isBest && (
                        <Badge className="bg-blue-800 text-white border-0 shadow-sm">Top Performer</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-5">
                      {['accuracy', 'precision', 'recall', 'f1'].map((metric) => (
                        <div key={metric}>
                          <div className="flex justify-between text-sm font-semibold mb-2">
                            <span className="text-gray-500 uppercase tracking-widest text-[10px]">{metric}</span>
                            <span className="text-gray-900">{model[metric]}%</span>
                          </div>
                          <Progress 
                            value={model[metric]} 
                            className="h-2 bg-gray-100" 
                            indicatorClassName={isBest ? "bg-blue-800" : "bg-gray-400"}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DashboardPage;
