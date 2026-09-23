#from langchain_groq import ChatGroq
#from dotenv import load_dotenv
#import os

#load_dotenv()

#def get_gemini():
#    return ChatGroq(
#        model="llama-3.3-70b-versatile",
#        api_key=os.getenv("GROQ_API_KEY"),
#        temperature=0.7
#    )

from langchain_groq import ChatGroq
from dotenv import load_dotenv
import os

load_dotenv()

def get_gemini():
    return ChatGroq(
        model="qwen/qwen3.8-27b",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.7
    )

