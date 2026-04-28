"""
Text Preprocessing Module for Fake Review Detection
Handles: Lowercasing, Tokenization, Stop-word removal, Lemmatization, Punctuation removal
"""
import re
import string
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet', quiet=True)


class TextPreprocessor:
    """Text preprocessing pipeline for review analysis"""
    
    def __init__(self):
        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = set(stopwords.words('english'))
        # Keep some negation words that are important for sentiment
        self.keep_words = {'not', 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere'}
        self.stop_words = self.stop_words - self.keep_words
    
    def clean_text(self, text: str) -> str:
        """Remove special characters, URLs, and extra whitespace"""
        if not text or not isinstance(text, str):
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove URLs
        text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
        
        # Remove HTML tags
        text = re.sub(r'<.*?>', '', text)
        
        # Remove email addresses
        text = re.sub(r'\S+@\S+', '', text)
        
        # Remove numbers
        text = re.sub(r'\d+', '', text)
        
        # Remove punctuation
        text = text.translate(str.maketrans('', '', string.punctuation))
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def tokenize(self, text: str) -> list:
        """Tokenize text into words"""
        try:
            return word_tokenize(text)
        except Exception:
            return text.split()
    
    def remove_stopwords(self, tokens: list) -> list:
        """Remove stopwords while keeping important negation words"""
        return [token for token in tokens if token not in self.stop_words]
    
    def lemmatize(self, tokens: list) -> list:
        """Lemmatize tokens to their base form"""
        return [self.lemmatizer.lemmatize(token) for token in tokens]
    
    def preprocess(self, text: str) -> str:
        """Full preprocessing pipeline"""
        # Clean text
        cleaned = self.clean_text(text)
        
        # Tokenize
        tokens = self.tokenize(cleaned)
        
        # Remove stopwords
        tokens = self.remove_stopwords(tokens)
        
        # Lemmatize
        tokens = self.lemmatize(tokens)
        
        # Join back to string
        return ' '.join(tokens)
    
    def preprocess_batch(self, texts: list) -> list:
        """Preprocess multiple texts"""
        return [self.preprocess(text) for text in texts]


# Singleton instance
preprocessor = TextPreprocessor()
