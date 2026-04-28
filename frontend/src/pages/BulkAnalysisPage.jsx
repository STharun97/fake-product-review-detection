import { useState, useRef } from "react";
import { Upload, FileText, Download, Loader2, CheckCircle, AlertTriangle, X, CloudUpload, HardDrive, Cpu, ScanLine } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { toast } from "sonner";
import axios from "axios";

const API_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8002') + '/api';

const BulkAnalysisPage = () => {
  const [file, setFile] = useState(null);
  const [model, setModel] = useState("auto");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error("Please select a valid CSV file");
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.csv')) {
        toast.error("Please drop a CSV file");
        return;
      }
      setFile(droppedFile);
      setResults(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${API_URL}/analyze/csv?model=${model}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      setResults(response.data);
      setShowResults(true);
      toast.success(`Successfully analyzed ${response.data.total_analyzed} reviews!`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.detail || "Failed to analyze CSV");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await axios.get(`${API_URL}/export/${format}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `review_analysis_export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    }
  };

  const downloadTemplate = () => {
    const template = "review_text,product_name,rating\n\"Your review text here\",\"Product Name\",5\n\"Another review\",\"Another Product\",4\n\"Best item ever!!!\",\"Example Product\",5";
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reviewguard_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const truncateText = (text, maxLength = 70) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/30 relative overflow-hidden">
      {/* Background Decorative Blurs */}
      <div className="absolute top-0 right-10 w-[400px] h-[400px] bg-blue-900/5 rounded-full blur-[100px] -z-10" />
      <div className="absolute top-40 left-10 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-10 right-1/4 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px] -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10" data-testid="bulk-header">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-blue-800 flex-shrink-0">
              <CloudUpload className="w-7 h-7" strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
                Bulk Analysis
              </h1>
              <p className="text-sm md:text-base font-medium text-gray-500 mt-1">
                Upload massive datasets to instantly identify review authenticity at scale
              </p>
            </div>
          </div>
          
          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleExport('csv')}
              variant="outline"
              className="rounded-xl border-gray-200 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-200 shadow-sm font-medium transition-all text-gray-700"
            >
              <Download className="w-4 h-4 mr-2 text-blue-700" />
              Export CSV
            </Button>
            <Button
              onClick={() => handleExport('json')}
              variant="outline"
              className="rounded-xl border-gray-200 hover:bg-cyan-50 hover:text-cyan-800 hover:border-cyan-200 shadow-sm font-medium transition-all text-gray-700"
            >
              <Download className="w-4 h-4 mr-2 text-cyan-600" />
              Export JSON
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-10">
          
          {/* Left Column: Upload Section */}
          <div className="lg:col-span-3 space-y-6">
            <div className="card-modern p-1 relative overflow-hidden bg-gradient-to-br from-blue-50 to-white">
              <div className="bg-white/70 backdrop-blur-md rounded-xl p-6 sm:p-8 h-full border border-white">
                <div className="flex items-center gap-2 mb-6">
                  <div className="bg-blue-50 p-2 rounded-lg text-blue-800">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <h2 className="font-heading text-lg font-bold text-gray-900">
                    Upload Dataset
                  </h2>
                </div>
                
                {/* Drag and Drop Zone */}
                <div
                  className={`
                    border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300
                    ${file ? 'border-blue-400 bg-blue-50/50 shadow-inner' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
                  `}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="drop-zone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    data-testid="file-input"
                  />
                  
                  {file ? (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 text-blue-800">
                        <FileText className="w-10 h-10" />
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="font-bold text-gray-900 text-lg mb-1">{file.name}</p>
                        <Badge variant="secondary" className="bg-white text-gray-500 px-3 border border-gray-100">
                          {(file.size / 1024).toFixed(1)} KB CSV Document
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="sm:ml-4 bg-white hover:bg-rose-50 hover:text-rose-600 rounded-full h-10 w-10 shadow-sm border border-gray-100"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="p-4 bg-blue-50 rounded-full text-blue-800 mb-4 ring-8 ring-blue-50/50">
                        <Upload className="w-8 h-8" strokeWidth={2} />
                      </div>
                      <p className="font-bold text-gray-700 text-lg mb-1">
                        Click or drag file to this area
                      </p>
                      <p className="text-sm text-gray-500 font-medium">
                        Supported format: <span className="text-blue-800 font-bold">.CSV</span> (up to 1,000 rows limit)
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Settings & Action Row */}
                <div className="mt-6 grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-gray-500 mb-2 pl-1">
                      <Cpu className="w-3.5 h-3.5" /> AI Engine
                    </label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="w-full bg-white border-gray-200 rounded-xl h-12 shadow-sm font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                        <SelectItem value="auto">Auto (Ensemble Router)</SelectItem>
                        <SelectItem value="traditional">Traditional ML (Fastest)</SelectItem>
                        <SelectItem value="lstm">LSTM Deep Learning (Detailed)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      data-testid="analyze-csv-btn"
                      onClick={handleUpload}
                      disabled={!file || isAnalyzing}
                      className="w-full h-12 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-base font-bold shadow-md shadow-blue-900/20 transition-all"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                          Processing Dataset...
                        </>
                      ) : (
                        <>
                          <ScanLine className="w-5 h-5 mr-3" strokeWidth={2} />
                          Analyze Dataset
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column: Instructions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card-modern p-6 sm:p-8 bg-white/80 backdrop-blur-sm h-full flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-amber-50 p-2 rounded-lg text-amber-500">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h2 className="font-heading text-lg font-bold text-gray-900">
                  Data Format Guide
                </h2>
              </div>
              
              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-600" /> Required Column
                  </h3>
                  <code className="text-sm text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 font-semibold shadow-sm block w-fit">review_text</code>
                </div>
                
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-800" /> Optional Metadata
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <code className="text-sm text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 font-semibold shadow-sm">product_name</code>
                    <code className="text-sm text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 font-semibold shadow-sm">rating</code>
                  </div>
                </div>
                
                <div className="bg-gray-900 text-gray-300 p-5 rounded-xl font-mono text-xs sm:text-sm shadow-inner overflow-x-auto">
                  <p className="text-gray-500 mb-3 italic"># Data.csv Example:</p>
                  <p className="text-emerald-400 mb-1">review_text,product_name,rating</p>
                  <p className="mb-1">"Excellent case! Fits perfectly",Phone Case Pro,5</p>
                  <p>"Terrible battery life.",Smart Watch v2,2</p>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="w-full rounded-xl border-dashed border-2 hover:bg-gray-50 hover:border-blue-400 hover:text-blue-800 transition-all font-medium h-12"
                  data-testid="download-template-btn"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary Bento Box */}
        {results && (
          <div className="animate-slide-up bg-white rounded-3xl p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-800 via-blue-700 to-cyan-500" />
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-800">
                  <ScanLine className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-heading text-2xl font-bold text-gray-900">
                    Scan Results
                  </h2>
                  <p className="text-sm font-medium text-gray-500">
                    Successfully processed {results.total_analyzed} items
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowResults(true)}
                className="btn-premium bg-gray-900 hover:bg-black text-white px-6 w-full sm:w-auto"
              >
                View Detailed Grid
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Total Card */}
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <p className="text-xs uppercase font-bold tracking-widest text-gray-400 mb-2">Total Extracted</p>
                <p className="font-heading text-5xl font-black text-gray-900">{results.total_analyzed}</p>
              </div>
              
              {/* Genuine Card */}
              <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-6 rounded-2xl border border-green-100 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10">
                  <CheckCircle className="w-24 h-24 text-green-600" />
                </div>
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <p className="text-xs uppercase font-bold tracking-widest text-green-800/70">Verified Genuine</p>
                  <Badge className="bg-green-600 text-white border-0 shadow-sm">{((results.genuine_count / results.total_analyzed) * 100).toFixed(0)}%</Badge>
                </div>
                <p className="font-heading text-5xl font-black text-green-700 relative z-10">{results.genuine_count}</p>
              </div>
              
              {/* Fake Card */}
              <div className="bg-gradient-to-br from-red-50 to-red-100/50 p-6 rounded-2xl border border-red-100 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10">
                  <AlertTriangle className="w-24 h-24 text-red-600" />
                </div>
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <p className="text-xs uppercase font-bold tracking-widest text-red-800/70">Flagged Fake</p>
                  <Badge className="bg-red-600 text-white border-0 shadow-sm">{((results.fake_count / results.total_analyzed) * 100).toFixed(0)}%</Badge>
                </div>
                <p className="font-heading text-5xl font-black text-red-700 relative z-10">{results.fake_count}</p>
              </div>
            </div>
            
            {/* Visual Distribution Bar */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
              <div className="flex justify-between text-sm font-bold mb-3">
                <span className="text-green-700 flex items-center gap-1.5"><CheckCircle className="w-4 h-4"/> Genuine ({((results.genuine_count / results.total_analyzed) * 100).toFixed(1)}%)</span>
                <span className="text-red-700 flex items-center gap-1.5">Fake ({((results.fake_count / results.total_analyzed) * 100).toFixed(1)}%) <AlertTriangle className="w-4 h-4"/></span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full flex overflow-hidden shadow-inner">
                <div 
                  className="bg-green-600 hover:brightness-110 transition-all"
                  style={{ width: `${(results.genuine_count / results.total_analyzed) * 100}%` }}
                />
                <div 
                  className="bg-red-600 hover:brightness-110 transition-all"
                  style={{ width: `${(results.fake_count / results.total_analyzed) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Results Full Screen Dialog */}
        <Dialog open={showResults} onOpenChange={setShowResults}>
          <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col overflow-hidden rounded-[24px] p-0 border-0 shadow-2xl" data-testid="results-dialog">
            
            <div className="p-6 border-b border-gray-100 bg-gray-50/80 backdrop-blur-md flex items-center justify-between flex-shrink-0">
              <div>
                <DialogTitle className="font-heading text-2xl font-bold text-gray-900 mb-1">
                  Detailed Analysis Log
                </DialogTitle>
                <DialogDescription className="font-medium text-gray-500">
                  Complete breakdown of {results?.total_analyzed} items processed by the {model === 'auto' ? 'Ensemble' : model.toUpperCase()} model.
                </DialogDescription>
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <Badge variant="outline" className="bg-white border-green-200 text-green-800 px-3 py-1 font-bold">
                  {results?.genuine_count} Genuine
                </Badge>
                <Badge variant="outline" className="bg-white border-red-200 text-red-800 px-3 py-1 font-bold">
                  {results?.fake_count} Fake
                </Badge>
              </div>
            </div>
            
            {results && (
              <div className="overflow-auto flex-1 bg-white p-6">
                <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow className="border-b-gray-200">
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 h-12 px-6">Review Content</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 h-12 w-[150px]">Product Info</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 h-12 text-center w-[100px]">Stars</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 h-12 text-center w-[140px]">Verdict</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 h-12 text-right px-6 w-[120px]">Confidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.results.map((result, index) => (
                        <TableRow key={result.id || index} className="hover:bg-gray-50 transition-colors border-b-gray-100 group">
                          <TableCell className="px-6 py-4">
                            <p className="text-sm text-gray-700 font-medium leading-relaxed">{truncateText(result.original_text, 100)}</p>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors border-0 font-semibold truncate max-w-[130px]" title={result.product_name || 'N/A'}>
                              {result.product_name || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-600 font-bold text-xs border border-amber-100">
                              {result.rating || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <Badge
                              className={`rounded-lg font-bold text-xs px-2.5 py-1 ${
                                result.is_fake ? 'bg-red-100 text-red-700 hover:bg-red-200 border-0' : 'bg-green-100 text-green-700 hover:bg-green-200 border-0'
                              }`}
                            >
                              {result.is_fake ? "FAKE" : "GENUINE"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right px-6 py-4">
                            <span className={`font-black tracking-tight ${result.confidence >= 90 ? 'text-gray-900' : 'text-gray-500'}`}>{result.confidence}%</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            
            <DialogFooter className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <DialogClose asChild>
                <Button variant="outline" className="rounded-xl px-8 font-bold border-gray-200 hover:bg-gray-100 transition-colors">
                  Close Details
                </Button>
              </DialogClose>
            </DialogFooter>
            
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default BulkAnalysisPage;
