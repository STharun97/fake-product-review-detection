"""
Model Training Module for Fake Review Detection
Trains and evaluates: Logistic Regression, Naive Bayes, SVM
Selects best model based on F1-score
"""
import os
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timezone
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
from .text_preprocessor import preprocessor


class ModelTrainer:
    """Train and evaluate multiple ML models for fake review detection"""
    
    def __init__(self, model_dir: str = None):
        self.model_dir = Path(model_dir) if model_dir else Path(__file__).parent / 'saved_models'
        self.model_dir.mkdir(parents=True, exist_ok=True)
        
        # TF-IDF Vectorizer with n-grams
        self.vectorizer = TfidfVectorizer(
            max_features=10000,
            ngram_range=(1, 3),  # Unigrams, bigrams, trigrams
            min_df=2,
            max_df=0.95
        )
        
        # Models to train
        self.models = {
            'logistic_regression': LogisticRegression(
                max_iter=1000, 
                C=1.0, 
                random_state=42,
                class_weight='balanced'
            ),
            'naive_bayes': MultinomialNB(alpha=0.1),
            'svm': LinearSVC(
                max_iter=2000, 
                C=1.0, 
                random_state=42,
                class_weight='balanced'
            )
        }
        
        self.best_model = None
        self.best_model_name = None
        self.metrics = {}
    
    def generate_synthetic_data(self, n_samples: int = 2000) -> pd.DataFrame:
        """Generate synthetic Amazon-style review data for training"""
        np.random.seed(42)
        
        # Genuine review patterns (more natural language)
        genuine_templates = [
            "I bought this {product} and it works great. {detail} Would recommend to anyone looking for a quality product.",
            "After using this for {time}, I can say it's {quality}. {detail} Good value for the price.",
            "This {product} is exactly what I needed. {detail} Shipping was fast and packaging was good.",
            "Pretty decent {product}. {detail} Not perfect but does the job well.",
            "I've been using this {product} for {time} now. {detail} Overall satisfied with my purchase.",
            "Great {product}! {detail} It's not the cheapest but worth every penny.",
            "This {product} exceeded my expectations. {detail} I would buy again.",
            "Solid {product} for the price. {detail} Minor issues but nothing major.",
            "I was skeptical at first but this {product} really works. {detail} Happy customer here.",
            "Good quality {product}. {detail} Arrived on time and as described.",
        ]
        
        # Fake review patterns (excessive praise, generic, suspicious)
        fake_templates = [
            "AMAZING!!! Best {product} EVER!!! Everyone MUST buy this!!! 5 stars!!!!!",
            "This is the greatest {product} I have ever purchased in my entire life. Absolutely perfect in every way. Buy now!!!",
            "WOW WOW WOW!!! Incredible {product}!!! Changed my life!!! Best purchase ever made!!!",
            "I cannot believe how amazing this {product} is!!! My family loves it!!! Buy immediately!!!",
            "Perfect perfect perfect!!! This {product} is absolutely flawless!!! Everyone needs this!!!",
            "BEST {product} ON THE MARKET!!! Nothing compares!!! BUY BUY BUY!!!",
            "I bought 10 of these {product}s for everyone I know!!! They all love it!!!",
            "This {product} is a miracle!!! Works perfectly!!! Best thing I ever bought!!!",
            "Outstanding {product}!!! Top quality!!! Fast shipping!!! Perfect seller!!! A+++++",
            "Amazing amazing amazing!!! This {product} is incredible!!! Must have!!!",
            "Five stars is not enough for this {product}!!! Deserves 10 stars!!!",
            "Best seller!!! Great product!!! Fast shipping!!! Recommended!!! A+++",
        ]
        
        products = ['product', 'item', 'purchase', 'thing', 'gadget', 'device', 'tool']
        times = ['a week', 'a month', 'several weeks', 'a few days', 'two months']
        qualities = ['pretty good', 'decent', 'solid', 'reliable', 'satisfactory']
        details = [
            "The quality is better than expected.",
            "Assembly was straightforward.",
            "It arrived well packaged.",
            "The color matches the photos.",
            "Instructions were clear.",
            "Customer service was helpful.",
            "Size is as described.",
            "Works as advertised.",
        ]
        
        reviews = []
        labels = []
        
        # Generate genuine reviews
        for _ in range(n_samples // 2):
            template = np.random.choice(genuine_templates)
            review = template.format(
                product=np.random.choice(products),
                time=np.random.choice(times),
                quality=np.random.choice(qualities),
                detail=np.random.choice(details)
            )
            # Add some natural variation
            if np.random.random() > 0.7:
                review = review.lower()
            reviews.append(review)
            labels.append(0)  # 0 = Genuine
        
        # Generate fake reviews
        for _ in range(n_samples // 2):
            template = np.random.choice(fake_templates)
            review = template.format(product=np.random.choice(products))
            reviews.append(review)
            labels.append(1)  # 1 = Fake
        
        # Add some edge cases
        edge_cases = [
            ("This product is okay. Nothing special but it works.", 0),
            ("DO NOT BUY!!! WORST EVER!!! SCAM!!!", 1),
            ("Received damaged. Seller resolved quickly. Updated to 4 stars.", 0),
            ("PERFECT SELLER!!! BEST PRODUCT!!! BUY NOW!!! HIGHLY RECOMMEND!!!", 1),
            ("Good product for the price. Some minor flaws but acceptable.", 0),
            ("INCREDIBLE!!! LIFE CHANGING!!! EVERYONE MUST HAVE THIS!!!", 1),
        ]
        
        for review, label in edge_cases:
            reviews.append(review)
            labels.append(label)
        
        return pd.DataFrame({'text': reviews, 'label': labels})
    
    def train(self, data: pd.DataFrame = None, test_size: float = 0.2) -> dict:
        """Train all models and select the best one"""
        
        # Use synthetic data if no data provided
        if data is None:
            print("Generating synthetic training data...")
            data = self.generate_synthetic_data(n_samples=3000)
        
        # Preprocess text
        print("Preprocessing text...")
        data['processed_text'] = preprocessor.preprocess_batch(data['text'].tolist())
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            data['processed_text'],
            data['label'],
            test_size=test_size,
            random_state=42,
            stratify=data['label']
        )
        
        # Fit vectorizer and transform
        print("Vectorizing text with TF-IDF...")
        X_train_vec = self.vectorizer.fit_transform(X_train)
        X_test_vec = self.vectorizer.transform(X_test)
        
        # Train and evaluate each model
        results = {}
        
        for name, model in self.models.items():
            print(f"Training {name}...")
            model.fit(X_train_vec, y_train)
            y_pred = model.predict(X_test_vec)
            
            metrics = {
                'accuracy': float(accuracy_score(y_test, y_pred)),
                'precision': float(precision_score(y_test, y_pred, average='weighted')),
                'recall': float(recall_score(y_test, y_pred, average='weighted')),
                'f1_score': float(f1_score(y_test, y_pred, average='weighted'))
            }
            
            results[name] = metrics
            print(f"  {name}: F1={metrics['f1_score']:.4f}, Acc={metrics['accuracy']:.4f}")
        
        # Select best model based on F1-score
        best_name = max(results, key=lambda x: results[x]['f1_score'])
        self.best_model = self.models[best_name]
        self.best_model_name = best_name
        self.metrics = results
        
        print(f"\nBest model: {best_name} (F1: {results[best_name]['f1_score']:.4f})")
        
        # Save models and vectorizer
        self._save_models()
        
        return {
            'best_model': best_name,
            'all_results': results,
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'trained_at': datetime.now(timezone.utc).isoformat()
        }
    
    def _save_models(self):
        """Save trained models and vectorizer to disk"""
        # Save vectorizer
        joblib.dump(self.vectorizer, self.model_dir / 'vectorizer.joblib')
        
        # Save all models
        for name, model in self.models.items():
            joblib.dump(model, self.model_dir / f'{name}.joblib')
        
        # Save metadata
        metadata = {
            'best_model': self.best_model_name,
            'metrics': self.metrics,
            'saved_at': datetime.now(timezone.utc).isoformat()
        }
        
        with open(self.model_dir / 'metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"Models saved to {self.model_dir}")
    
    def load_models(self) -> bool:
        """Load pre-trained models from disk"""
        try:
            # Load vectorizer
            self.vectorizer = joblib.load(self.model_dir / 'vectorizer.joblib')
            
            # Load metadata
            with open(self.model_dir / 'metadata.json', 'r') as f:
                metadata = json.load(f)
            
            self.best_model_name = metadata['best_model']
            self.metrics = metadata['metrics']
            
            # Load best model
            self.best_model = joblib.load(self.model_dir / f'{self.best_model_name}.joblib')
            
            # Load all models
            for name in self.models.keys():
                model_path = self.model_dir / f'{name}.joblib'
                if model_path.exists():
                    self.models[name] = joblib.load(model_path)
            
            print(f"Loaded models from {self.model_dir}")
            return True
        except Exception as e:
            print(f"Could not load models: {e}")
            return False
