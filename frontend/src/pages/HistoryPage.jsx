import { useState, useEffect } from "react";
import { History, Trash2, Eye, AlertTriangle, CheckCircle, Loader2, RefreshCw, Clock, CalendarDays, Search } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "../components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";

const API_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8002') + '/api';

const HistoryPage = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/predictions?limit=100`);
      setPredictions(response.data);
    } catch (error) {
      console.error("Error fetching predictions:", error);
      toast.error("Failed to load prediction history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/predictions/${id}`);
      setPredictions(predictions.filter((p) => p.id !== id));
      toast.success("Prediction deleted from history");
    } catch (error) {
      console.error("Error deleting prediction:", error);
      toast.error("Failed to delete prediction");
    }
  };

  const handleViewDetails = (prediction) => {
    setSelectedPrediction(prediction);
    setDetailsOpen(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateText = (text, maxLength = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/30 relative overflow-hidden">
      {/* Background Blurs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-900/5 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px] -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10" data-testid="history-header">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-blue-800">
              <Clock className="w-7 h-7" strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-extrabold tracking-tight text-gray-900">
                Analysis History
              </h1>
              <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-50 text-blue-800 hover:bg-blue-100 border-0">
                  {predictions.length} Total
                </Badge>
                Previously analyzed reviews
              </p>
            </div>
          </div>
          <Button
            data-testid="refresh-button"
            onClick={fetchPredictions}
            variant="outline"
            className="rounded-xl border-gray-200 hover:bg-white shadow-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 mr-2 text-blue-800 ${loading ? 'animate-spin' : ''}`} strokeWidth={2} />
            Refresh List
          </Button>
        </div>

        {/* Table Container */}
        <div className="card-modern bg-white overflow-hidden border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32" data-testid="loading-state">
              <Loader2 className="w-10 h-10 animate-spin text-blue-800 mb-4" />
              <p className="text-gray-500 font-medium">Loading history data...</p>
            </div>
          ) : predictions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 px-4 text-center" data-testid="empty-state">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-gray-50/50">
                <Search className="w-10 h-10 text-gray-300" strokeWidth={1.5} />
              </div>
              <h3 className="font-heading text-xl font-bold text-gray-900 mb-2">No History Found</h3>
              <p className="text-gray-500 max-w-sm">
                You haven't analyzed any reviews yet. Go to the Home or Bulk Analysis page to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto" data-testid="predictions-table">
              <Table>
                <TableHeader className="bg-gray-50/80">
                  <TableRow className="border-b border-gray-100 hover:bg-transparent">
                    <TableHead className="font-heading font-bold uppercase text-[11px] tracking-widest text-gray-500 h-14 px-6">
                      Original Review
                    </TableHead>
                    <TableHead className="font-heading font-bold uppercase text-[11px] tracking-widest text-gray-500 h-14 w-[140px]">
                      Result
                    </TableHead>
                    <TableHead className="font-heading font-bold uppercase text-[11px] tracking-widest text-gray-500 h-14 text-center w-[120px]">
                      Confidence
                    </TableHead>
                    <TableHead className="font-heading font-bold uppercase text-[11px] tracking-widest text-gray-500 h-14 w-[160px]">
                      AI Model
                    </TableHead>
                    <TableHead className="font-heading font-bold uppercase text-[11px] tracking-widest text-gray-500 h-14 w-[180px]">
                      Date & Time
                    </TableHead>
                    <TableHead className="font-heading font-bold uppercase text-[11px] tracking-widest text-gray-500 h-14 text-right pr-6 w-[120px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {predictions.map((prediction) => (
                    <TableRow 
                      key={prediction.id} 
                      className="hover:bg-blue-50/30 transition-colors border-b border-gray-50 group"
                      data-testid={`prediction-row-${prediction.id}`}
                    >
                      <TableCell className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-700 line-clamp-2 leading-relaxed max-w-lg">
                          {prediction.original_text}
                        </p>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge
                          className={`font-bold text-xs px-2.5 py-1 uppercase tracking-wider border-0 shadow-sm ${
                            prediction.is_fake ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                          }`}
                        >
                          {prediction.is_fake ? (
                            <AlertTriangle className="w-3 h-3 mr-1.5 inline-block -mt-0.5" strokeWidth={2} />
                          ) : (
                            <CheckCircle className="w-3 h-3 mr-1.5 inline-block -mt-0.5" strokeWidth={2} />
                          )}
                          {prediction.prediction}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <span className={`font-black text-[15px] ${prediction.confidence >= 90 ? 'text-gray-900' : 'text-gray-500'}`}>
                          {prediction.confidence}%
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase text-blue-800 bg-blue-50 border-0">
                          {prediction.model_used?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                          <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                          {formatDate(prediction.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(prediction)}
                            className="h-9 w-9 rounded-xl hover:bg-blue-100 hover:text-blue-800 text-gray-400 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4.5 h-4.5" strokeWidth={2} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(prediction.id)}
                            className="h-9 w-9 rounded-xl hover:bg-red-100 hover:text-red-700 text-gray-400 transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4.5 h-4.5" strokeWidth={2} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Detailed View Modal */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl rounded-[24px] p-0 overflow-hidden border-0 shadow-2xl" data-testid="details-dialog">
            
            {selectedPrediction && (
              <>
                <div className={`p-6 border-b ${selectedPrediction.is_fake ? 'bg-red-50/50 border-red-100' : 'bg-green-50/50 border-green-100'}`}>
                  <DialogHeader>
                    <DialogTitle className="font-heading text-xl font-bold flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${selectedPrediction.is_fake ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {selectedPrediction.is_fake ? (
                            <AlertTriangle className="w-5 h-5" strokeWidth={2} />
                          ) : (
                            <CheckCircle className="w-5 h-5" strokeWidth={2} />
                          )}
                        </div>
                        <span className="text-gray-900">Analysis Details</span>
                      </div>
                      
                      <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-gray-100">
                        <span className={`text-sm font-bold uppercase tracking-wider ${selectedPrediction.is_fake ? "text-red-600" : "text-green-600"}`}>
                          {selectedPrediction.prediction}
                        </span>
                        <div className="w-px h-4 bg-gray-200" />
                        <span className="font-heading text-xl font-black text-gray-900">
                          {selectedPrediction.confidence}%
                        </span>
                      </div>
                    </DialogTitle>
                  </DialogHeader>
                </div>
                
                <div className="p-6 space-y-6 bg-white overflow-y-auto max-h-[70vh]">
                  
                  {/* Original Review */}
                  <div>
                    <h4 className="font-heading text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-blue-800 rounded-full" /> Original Text
                    </h4>
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 text-[15px] text-gray-700 leading-relaxed shadow-inner">
                      "{selectedPrediction.original_text}"
                    </div>
                  </div>

                  {/* Probabilities Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50/50 rounded-xl p-4 border border-green-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-green-800">Genuine Score</span>
                        <span className="text-lg font-black text-green-700">{selectedPrediction.genuine_probability}%</span>
                      </div>
                      <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-600 rounded-full" style={{ width: `${selectedPrediction.genuine_probability}%` }} />
                      </div>
                    </div>
                    
                    <div className="bg-red-50/50 rounded-xl p-4 border border-red-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-red-800">Fake Score</span>
                        <span className="text-lg font-black text-red-700">{selectedPrediction.fake_probability}%</span>
                      </div>
                      <div className="h-2 bg-red-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-600 rounded-full" style={{ width: `${selectedPrediction.fake_probability}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Indicators */}
                  {selectedPrediction.indicators && selectedPrediction.indicators.length > 0 && (
                    <div>
                      <h4 className="font-heading text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-amber-500 rounded-full" /> Detected Signals
                      </h4>
                      <div className="space-y-2 border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                        {selectedPrediction.indicators.map((indicator, index) => (
                          <div
                            key={index}
                            className={`flex sm:items-center flex-col sm:flex-row justify-between gap-3 p-4 bg-gray-50/30 hover:bg-gray-50 transition-colors
                              ${indicator.severity === 'high' ? 'border-l-4 border-l-red-600' : 'border-l-4 border-l-amber-500'}`}
                          >
                            <span className="text-sm font-medium text-gray-700">{indicator.description}</span>
                            <Badge variant="outline" className={`text-[10px] font-bold uppercase px-2 py-0.5 border-0 self-start sm:self-auto
                              ${indicator.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                              {indicator.severity}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-4 py-6 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      <span>Analyzed by:</span>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-800 border-0 uppercase text-[10px] font-bold tracking-wider">
                        {selectedPrediction.model_used?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {formatDate(selectedPrediction.created_at)}
                    </div>
                  </div>

                  <DialogFooter className="pt-2">
                    <DialogClose asChild>
                      <Button variant="outline" className="w-full sm:w-auto rounded-xl border-gray-200 hover:bg-gray-50 transition-colors">
                        Close Details
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                  
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default HistoryPage;
