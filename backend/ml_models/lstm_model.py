"""
LSTM Deep Learning Model for Fake Review Detection
Provides enhanced accuracy with neural network approach
"""
import os
import json
import numpy as np
from pathlib import Path
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras.models import Sequential, load_model
    from tensorflow.keras.layers import Embedding, LSTM, Dense, Dropout, Bidirectional
    from tensorflow.keras.preprocessing.text import Tokenizer
    from tensorflow.keras.preprocessing.sequence import pad_sequences
    from tensorflow.keras.callbacks import EarlyStopping
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    logger.warning("TensorFlow not available. LSTM model will be disabled.")

from .text_preprocessor import preprocessor


class LSTMModel:
    """LSTM-based deep learning model for fake review detection"""
    
    def __init__(self, model_dir: str = None):
        self.model_dir = Path(model_dir) if model_dir else Path(__file__).parent / 'saved_models'
        self.model_dir.mkdir(parents=True, exist_ok=True)
        
        self.model = None
        self.tokenizer = None
        self.max_length = 200
        self.vocab_size = 10000
        self.embedding_dim = 128
        self.is_trained = False
        self.metrics = {}
        
    def _build_model(self):
        """Build LSTM architecture"""
        if not TENSORFLOW_AVAILABLE:
            raise ImportError("TensorFlow is required for LSTM model")
            
        model = Sequential([
            Embedding(self.vocab_size, self.embedding_dim, input_length=self.max_length),
            Bidirectional(LSTM(64, return_sequences=True)),
            Dropout(0.3),
            Bidirectional(LSTM(32)),
            Dropout(0.3),
            Dense(64, activation='relu'),
            Dropout(0.2),
            Dense(1, activation='sigmoid')
        ])
        
        model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    def train(self, texts: list, labels: list, epochs: int = 10, batch_size: int = 32, validation_split: float = 0.2):
        """Train the LSTM model"""
        if not TENSORFLOW_AVAILABLE:
            raise ImportError("TensorFlow is required for LSTM model")
        
        logger.info("Preprocessing texts for LSTM...")
        processed_texts = preprocessor.preprocess_batch(texts)
        
        # Tokenize texts
        logger.info("Tokenizing texts...")
        self.tokenizer = Tokenizer(num_words=self.vocab_size, oov_token='<OOV>')
        self.tokenizer.fit_on_texts(processed_texts)
        
        sequences = self.tokenizer.texts_to_sequences(processed_texts)
        padded = pad_sequences(sequences, maxlen=self.max_length, padding='post', truncating='post')
        
        labels_array = np.array(labels)
        
        # Build and train model
        logger.info("Building LSTM model...")
        self.model = self._build_model()
        
        early_stopping = EarlyStopping(
            monitor='val_loss',
            patience=3,
            restore_best_weights=True
        )
        
        logger.info("Training LSTM model...")
        history = self.model.fit(
            padded, labels_array,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            callbacks=[early_stopping],
            verbose=1
        )
        
        # Get final metrics
        val_loss = history.history['val_loss'][-1]
        val_accuracy = history.history['val_accuracy'][-1]
        
        self.metrics = {
            'accuracy': float(val_accuracy),
            'loss': float(val_loss),
            'epochs_trained': len(history.history['loss']),
            'trained_at': datetime.now(timezone.utc).isoformat()
        }
        
        self.is_trained = True
        self._save_model()
        
        logger.info(f"LSTM training complete. Accuracy: {val_accuracy:.4f}")
        return self.metrics
    
    def predict(self, text: str) -> dict:
        """Predict if a review is fake"""
        if not self.is_trained:
            if not self.load_model():
                raise ValueError("LSTM model not trained. Please train first.")
        
        # Preprocess
        processed = preprocessor.preprocess(text)
        
        # Tokenize and pad
        sequence = self.tokenizer.texts_to_sequences([processed])
        padded = pad_sequences(sequence, maxlen=self.max_length, padding='post', truncating='post')
        
        # Predict
        prediction = self.model.predict(padded, verbose=0)[0][0]
        
        is_fake = prediction > 0.5
        confidence = float(prediction) if is_fake else float(1 - prediction)
        
        return {
            'prediction': 'FAKE' if is_fake else 'GENUINE',
            'is_fake': bool(is_fake),
            'confidence': round(confidence * 100, 2),
            'fake_probability': round(float(prediction) * 100, 2),
            'genuine_probability': round(float(1 - prediction) * 100, 2),
            'model_used': 'lstm'
        }
    
    def predict_batch(self, texts: list) -> list:
        """Predict multiple reviews"""
        if not self.is_trained:
            if not self.load_model():
                raise ValueError("LSTM model not trained. Please train first.")
        
        # Preprocess all texts
        processed = preprocessor.preprocess_batch(texts)
        
        # Tokenize and pad
        sequences = self.tokenizer.texts_to_sequences(processed)
        padded = pad_sequences(sequences, maxlen=self.max_length, padding='post', truncating='post')
        
        # Predict
        predictions = self.model.predict(padded, verbose=0)
        
        results = []
        for pred in predictions:
            prob = pred[0]
            is_fake = prob > 0.5
            confidence = float(prob) if is_fake else float(1 - prob)
            
            results.append({
                'prediction': 'FAKE' if is_fake else 'GENUINE',
                'is_fake': bool(is_fake),
                'confidence': round(confidence * 100, 2),
                'fake_probability': round(float(prob) * 100, 2),
                'genuine_probability': round(float(1 - prob) * 100, 2),
                'model_used': 'lstm'
            })
        
        return results
    
    def _save_model(self):
        """Save model and tokenizer"""
        if self.model:
            self.model.save(self.model_dir / 'lstm_model.keras')
        
        if self.tokenizer:
            tokenizer_config = self.tokenizer.to_json()
            with open(self.model_dir / 'lstm_tokenizer.json', 'w') as f:
                f.write(tokenizer_config)
        
        with open(self.model_dir / 'lstm_metadata.json', 'w') as f:
            json.dump({
                'metrics': self.metrics,
                'max_length': self.max_length,
                'vocab_size': self.vocab_size,
                'embedding_dim': self.embedding_dim
            }, f, indent=2)
        
        logger.info(f"LSTM model saved to {self.model_dir}")
    
    def load_model(self) -> bool:
        """Load saved model"""
        if not TENSORFLOW_AVAILABLE:
            return False
            
        try:
            model_path = self.model_dir / 'lstm_model.keras'
            tokenizer_path = self.model_dir / 'lstm_tokenizer.json'
            metadata_path = self.model_dir / 'lstm_metadata.json'
            
            if not all(p.exists() for p in [model_path, tokenizer_path, metadata_path]):
                return False
            
            self.model = load_model(model_path)
            
            with open(tokenizer_path, 'r') as f:
                tokenizer_config = f.read()
            self.tokenizer = keras.preprocessing.text.tokenizer_from_json(tokenizer_config)
            
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            self.metrics = metadata.get('metrics', {})
            self.max_length = metadata.get('max_length', 200)
            self.vocab_size = metadata.get('vocab_size', 10000)
            self.embedding_dim = metadata.get('embedding_dim', 128)
            
            self.is_trained = True
            logger.info("LSTM model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error loading LSTM model: {e}")
            return False
    
    def get_metrics(self) -> dict:
        """Get model metrics"""
        return self.metrics


# Check if LSTM is available
def is_lstm_available() -> bool:
    return TENSORFLOW_AVAILABLE


# Singleton instance
lstm_model = LSTMModel() if TENSORFLOW_AVAILABLE else None
