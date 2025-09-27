'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Activity, Shield, Brain, Zap } from 'lucide-react';

interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  confidence?: number;
  timestamp: string;
}

export default function HeroSection() {
  const [priceData, setPriceData] = useState<PriceData | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Fetch ONLY real ALGO data from backend aggregator - NO MOCK DATA
  const fetchPrice = async () => {
    try {
      setIsLoading(true);
      
      // Use backend price aggregator (CoinLore, Cryptonator, Binance, CoinGecko fallback)
      const response = await fetch('http://localhost:8000/price/current');
      
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || typeof data.aggregated_price !== 'number') {
        throw new Error('No valid ALGO data received from backend');
      }
      
      // Extract real volume from sources
      const realVolume = data.sources?.find((s: { volume_24h: number }) => s.volume_24h > 0)?.volume_24h || 0;
      const realChange = data.sources?.find((s: { change_24h: number }) => s.change_24h)?.change_24h || 0;
      
      setPriceData({
        price: data.aggregated_price,
        change: realChange,
        changePercent: realChange,
        volume: realVolume,
        confidence: (data.confidence * 100), // Convert to percentage
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to fetch real ALGO data:', error);
      // NO FALLBACK - Show error state instead  
      setPriceData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh price every 30 seconds
  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  const isPositive = priceData ? priceData.change >= 0 : false;

  return (
    <div className="text-center space-y-8">
      {/* Main Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-4"
      >
        <Badge variant="secondary" className="mb-4 bg-purple-500/20 text-purple-200 border-purple-500/30">
          <Shield className="w-3 h-3 mr-1" />
          Zero-Knowledge Price Oracle
        </Badge>
        
        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
          ALGO ZK Oracle
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
          Privacy-preserving price predictions powered by 
          <span className="text-purple-400 font-semibold"> Zero-Knowledge ML ensemble models</span>
        </p>
      </motion.div>

      {/* Live Price Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="max-w-4xl mx-auto"
      >
        <Card className="bg-white/5 backdrop-blur-lg border-white/10 p-8">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              
              {/* Current Price */}
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-300 font-medium">ALGO Live Price</span>
                  {isLoading && (
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                
                {priceData ? (
                  <div className="space-y-2">
                    <div className="text-4xl md:text-5xl font-bold text-white">
                      ${priceData.price.toFixed(4)}
                    </div>
                    
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{priceData.change.toFixed(4)} ({priceData.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-4xl md:text-5xl font-bold text-red-400">
                      API Error
                    </div>
                    <div className="text-red-300">
                      Failed to load real ALGO data
                    </div>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-gray-400 text-sm">24h Volume</div>
                  <div className="text-xl font-semibold text-white">
                    {priceData?.volume ? 
                      `$${(priceData.volume / 1000000).toFixed(2)}M` : 
                      'Loading...'
                    }
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-gray-400 text-sm">Data Source</div>
                  <div className="text-xl font-semibold text-green-400">
                    {priceData ? 'CoinGecko' : 'Connecting...'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  onClick={fetchPrice}
                  disabled={isLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Refresh Price
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Generate ZK Prediction
                </Button>
              </div>
              
            </div>
            
            {/* Last Updated */}
            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <span className="text-xs text-gray-400">
                Last updated: {priceData?.timestamp ? new Date(priceData.timestamp).toLocaleTimeString() : 'Loading...'}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Feature Highlights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="font-semibold text-white">Private ML Models</h3>
          <p className="text-sm text-gray-400">Model weights hidden with ZK-SNARKs</p>
        </div>
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <Brain className="w-6 h-6 text-green-400" />
          </div>
          <h3 className="font-semibold text-white">Ensemble AI</h3>
          <p className="text-sm text-gray-400">LSTM, GRU, Prophet & XGBoost</p>
        </div>
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
            <Activity className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="font-semibold text-white">Real-time Oracle</h3>
          <p className="text-sm text-gray-400">Live price feeds & predictions</p>
        </div>
      </motion.div>
    </div>
  );
}