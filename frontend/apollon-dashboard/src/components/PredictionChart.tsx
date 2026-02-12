'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { RefreshCw, Activity, Brain, Timer } from 'lucide-react';

interface PredictionData {
  symbol: string;
  timeframe: string;
  predicted_price: number;
  current_price: number;
  price_change: number;
  price_change_percent: number;
  confidence: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  individual_predictions: {
    lstm: number;
    gru: number;
    prophet: number;
    xgboost: number;
  };
  model_weights: {
    lstm: number;
    gru: number;
    prophet: number;
    xgboost: number;
  };
  timestamp: string;
}

interface ChartDataPoint {
  time: string;
  current: number;
  predicted: number;
  lower: number;
  upper: number;
  lstm: number;
  gru: number;
  prophet: number;
  xgboost: number;
}

export default function PredictionChart() {
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate prediction data
  const generatePrediction = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: 'ALGOUSD',
          timeframe: '24h'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PredictionData = await response.json();
      setPredictionData(data);
      
      // Create chart data points
      const now = new Date();
      const dataPoints: ChartDataPoint[] = [];
      
      // Historical point (current)
      dataPoints.push({
        time: now.toLocaleTimeString(),
        current: data.current_price,
        predicted: data.current_price,
        lower: data.current_price,
        upper: data.current_price,
        lstm: data.individual_predictions.lstm,
        gru: data.individual_predictions.gru,
        prophet: data.individual_predictions.prophet,
        xgboost: data.individual_predictions.xgboost
      });

      // Prediction point (24h future)
      const futureTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      dataPoints.push({
        time: futureTime.toLocaleTimeString(),
        current: data.current_price, // Keep current price line flat
        predicted: data.predicted_price,
        lower: data.confidence_interval.lower,
        upper: data.confidence_interval.upper,
        lstm: data.individual_predictions.lstm,
        gru: data.individual_predictions.gru,
        prophet: data.individual_predictions.prophet,
        xgboost: data.individual_predictions.xgboost
      });

      setChartData(dataPoints);
      
    } catch (err) {
      console.error('Prediction error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate prediction');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load prediction on component mount
  useEffect(() => {
    generatePrediction();
  }, []);

  const formatPrice = (value: number) => `$${value.toFixed(4)}`;
  const formatPercent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 backdrop-blur-lg border border-white/20 rounded-lg p-3 space-y-2">
          <p className="text-white font-medium">{`Time: ${label}`}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${formatPrice(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-neutral-400" />
            Price Prediction Chart
          </CardTitle>
          <p className="text-gray-400 mt-1">24-hour ML ensemble forecasting</p>
        </div>
        
        <Button 
          onClick={generatePrediction}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Brain className="w-4 h-4 mr-2" />
          )}
          {isLoading ? 'Generating...' : 'New Prediction'}
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-200 text-sm">Error: {error}</p>
            <Button 
              onClick={generatePrediction} 
              variant="outline" 
              size="sm" 
              className="mt-2 border-red-500/30 text-red-200"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Prediction Summary */}
        {predictionData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-gray-400 text-sm">Current Price</div>
              <div className="text-2xl font-bold text-white">
                {formatPrice(predictionData.current_price)}
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-gray-400 text-sm">24h Prediction</div>
              <div className="text-2xl font-bold text-neutral-400">
                {formatPrice(predictionData.predicted_price)}
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-gray-400 text-sm">Expected Change</div>
              <div className={`text-2xl font-bold ${
                predictionData.price_change >= 0 ? 'text-neutral-400' : 'text-neutral-500'
              }`}>
                {formatPercent(predictionData.price_change_percent)}
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-gray-400 text-sm">Confidence</div>
              <div className="text-2xl font-bold text-neutral-400">
                {(predictionData.confidence * 100).toFixed(1)}%
              </div>
            </div>
          </motion.div>
        )}

        {/* Chart */}
        <div className="h-80 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={formatPrice}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Confidence interval */}
                <Line 
                  type="monotone" 
                  dataKey="upper" 
                  stroke="#EF4444" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="lower" 
                  stroke="#EF4444" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
                
                {/* Current price line */}
                <Line 
                  type="monotone" 
                  dataKey="current" 
                  stroke="#9CA3AF" 
                  strokeWidth={2}
                  dot={{ fill: '#9CA3AF', strokeWidth: 2, r: 4 }}
                />
                
                {/* Prediction line */}
                <Line 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke="#60A5FA" 
                  strokeWidth={3}
                  dot={{ fill: '#60A5FA', strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <Timer className="w-12 h-12 text-gray-500 mx-auto" />
                <div className="text-gray-400">
                  {isLoading ? 'Generating prediction...' : 'No prediction data available'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Individual Model Predictions */}
        {predictionData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h3 className="text-lg font-semibold text-white mb-3">Individual Model Predictions</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(predictionData.individual_predictions).map(([model, prediction]) => {
                const weight = predictionData.model_weights[model as keyof typeof predictionData.model_weights];
                const colors = {
                  lstm: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                  gru: 'bg-green-500/20 text-green-300 border-green-500/30',
                  prophet: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
                  xgboost: 'bg-neutral-800 text-purple-300 border-neutral-700'
                };
                
                return (
                  <div key={model} className={`rounded-lg p-3 border ${colors[model as keyof typeof colors]}`}>
                    <div className="text-sm font-medium uppercase">{model}</div>
                    <div className="text-lg font-bold">{formatPrice(prediction)}</div>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {(weight * 100).toFixed(0)}% weight
                    </Badge>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}