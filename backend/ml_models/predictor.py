"""
Prediction Module for Fake Review Detection
Loads trained model and makes predictions with confidence scores
"""
import numpy as np
from pathlib import Path
from .text_preprocessor import preprocessor
from .model_trainer import ModelTrainer


class ReviewPredictor:
    """Make predictions on review text using trained models"""
    
    def __init__(self):
        self.trainer = ModelTrainer()
        self.is_loaded = False
        self._initialize()
    
    def _initialize(self):
        """Initialize predictor by loading or training models"""
        # Try to load existing models
        if self.trainer.load_models():
            self.is_loaded = True
            print("Predictor initialized with pre-trained models")
        else:
            # Train new models if none exist
            print("No pre-trained models found. Training new models...")
            self.trainer.train()
            self.is_loaded = True
            print("Predictor initialized with newly trained models")
    
    def predict(self, review_text: str) -> dict:
        """
        Predict if a review is fake or genuine
        
        Returns:
            dict with prediction, confidence, and preprocessing details
        """
        if not self.is_loaded:
            self._initialize()
        
        # Preprocess the text
        original_text = review_text
        processed_text = preprocessor.preprocess(review_text)
        
        # Vectorize
        text_vector = self.trainer.vectorizer.transform([processed_text])
        
        # Get prediction
        prediction = self.trainer.best_model.predict(text_vector)[0]
        
        # Get confidence score
        if hasattr(self.trainer.best_model, 'predict_proba'):
            probabilities = self.trainer.best_model.predict_proba(text_vector)[0]
            confidence = float(max(probabilities))
            fake_prob = float(probabilities[1]) if len(probabilities) > 1 else float(probabilities[0])
            genuine_prob = float(probabilities[0]) if len(probabilities) > 1 else 1 - float(probabilities[0])
        elif hasattr(self.trainer.best_model, 'decision_function'):
            # For SVM, use decision function to estimate confidence
            decision = self.trainer.best_model.decision_function(text_vector)[0]
            # Sigmoid to convert to probability-like score
            confidence = 1 / (1 + np.exp(-abs(decision)))
            if decision > 0:
                fake_prob = confidence
                genuine_prob = 1 - confidence
            else:
                genuine_prob = confidence
                fake_prob = 1 - confidence
        else:
            confidence = 0.5
            fake_prob = 0.5
            genuine_prob = 0.5
        
        # Determine label
        label = "FAKE" if prediction == 1 else "GENUINE"
        
        # Analyze text features that contributed to the prediction
        indicators = self._analyze_indicators(original_text, processed_text)
        
        return {
            'prediction': label,
            'is_fake': bool(prediction == 1),
            'confidence': round(confidence * 100, 2),
            'fake_probability': round(fake_prob * 100, 2),
            'genuine_probability': round(genuine_prob * 100, 2),
            'model_used': self.trainer.best_model_name,
            'indicators': indicators,
            'processed_text': processed_text
        }
    
    def _analyze_indicators(self, original: str, processed: str) -> list:
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
        
        # Check for repeated words/phrases
        word_list = processed.split()
        if len(word_list) > 3:
            unique_ratio = len(set(word_list)) / len(word_list)
            if unique_ratio < 0.5:
                indicators.append({
                    'type': 'repetitive_content',
                    'description': 'High word repetition detected',
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
        
        # Check text length
        if len(original) < 30:
            indicators.append({
                'type': 'too_short',
                'description': 'Review is very short',
                'severity': 'low'
            })
        elif len(original) > 2000:
            indicators.append({
                'type': 'too_long',
                'description': 'Unusually long review',
                'severity': 'low'
            })
        
        return indicators
    
    def get_model_metrics(self) -> dict:
        """Get performance metrics of all trained models"""
        return {
            'best_model': self.trainer.best_model_name,
            'metrics': self.trainer.metrics
        }
    
    def retrain(self, texts: list = None, labels: list = None) -> dict:
        """Retrain models with fresh data"""
        if texts and labels:
            import pandas as pd
            data = pd.DataFrame({'text': texts, 'label': labels})
            return self.trainer.train(data=data)
        return self.trainer.train()


# Singleton predictor instance
predictor = ReviewPredictor()
