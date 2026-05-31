# 🤖 AI Quiz Generation Feature

QuizMaster includes an **AI-powered quiz generation** feature that automatically creates quiz questions based on your topic or study materials using **Groq AI**.

---

## 🌟 Overview

The AI Quiz Generator allows you to:
- **Generate complete quizzes** from a simple topic description
- **Paste study notes** and get relevant questions automatically
- **Customize difficulty levels** (Easy, Medium, Hard)
- **Control the number of questions** (unlimited)
- **Save time** creating quizzes manually

---

## 🚀 Getting Started

### Prerequisites

1. **Groq API Key**: You need a free Groq API key
   - Sign up at: https://console.groq.com
   - Navigate to: **API Keys** section
   - Click **Create API Key**
   - Copy your key (starts with `gsk_...`)

2. **Configure Environment Variable**:
   - Add `VITE_GROQ_API_KEY` to your `.env` file
   - For Vercel deployment, add it to Environment Variables in Vercel dashboard

---

## 📝 How to Use AI Quiz Generation

### Step 1: Access the AI Generator

1. Log in to QuizMaster
2. Navigate to **Create Quiz** page
3. Click the **"Generate with AI"** button (purple button with wand icon)

### Step 2: Configure Your Quiz

A modal will appear with the following options:

#### **Topic / Study Notes**
- Enter a topic name (e.g., "World War II", "Python Programming", "Photosynthesis")
- OR paste your study notes/lecture content
- The AI will analyze the content and generate relevant questions

**Examples:**
```
Simple Topic:
"JavaScript Array Methods"

Detailed Notes:
"The mitochondria is the powerhouse of the cell. It produces ATP through 
cellular respiration. The process involves glycolysis, Krebs cycle, and 
electron transport chain..."
```

#### **Number of Questions**
- Enter any number (1 to unlimited)
- Default: 5 questions
- **Note**: More questions = longer generation time

#### **Difficulty Level**
Choose from:
- **Easy**: Basic recall and understanding
- **Medium**: Application and analysis (default)
- **Hard**: Complex reasoning and synthesis

### Step 3: Generate

1. Click **"Generate Questions"**
2. Wait for the AI to process (usually 5-15 seconds)
3. The quiz will auto-populate with:
   - Generated title
   - Description
   - All questions with multiple-choice options
   - Pre-selected correct answers

### Step 4: Review and Edit

After generation:
- **Review all questions** for accuracy
- **Edit any question** text or options as needed
- **Change correct answers** if necessary
- **Add or remove questions** manually
- **Reorder questions** using up/down arrows

### Step 5: Save

Click **"Create Quiz"** to save your AI-generated quiz to the database.

---

## 🎯 Best Practices

### For Best Results:

1. **Be Specific**: 
   - ❌ "Science" 
   - ✅ "Photosynthesis in Plants"

2. **Provide Context**:
   - Include key terms, definitions, or concepts
   - Paste relevant paragraphs from textbooks or notes

3. **Use Appropriate Difficulty**:
   - **Easy**: For introductory courses or quick assessments
   - **Medium**: For standard classroom tests
   - **Hard**: For advanced students or competitive exams

4. **Always Review**:
   - AI-generated content should be reviewed for accuracy
   - Verify correct answers are properly marked
   - Ensure questions align with your learning objectives

---

## 🔧 Technical Details

### AI Model
- **Provider**: Groq
- **Model**: Llama 3.1 70B Versatile
- **Speed**: Ultra-fast inference (~500 tokens/second)
- **Cost**: Free tier available

### Generation Process

1. **Input Processing**: Your topic/notes are sent to Groq AI
2. **Prompt Engineering**: A specialized prompt instructs the AI to:
   - Generate multiple-choice questions
   - Create 4 options per question
   - Mark the correct answer
   - Match the specified difficulty level
3. **Response Parsing**: The AI response is parsed into structured quiz data
4. **Auto-Population**: Questions are loaded into the quiz creation form

### Data Privacy
- Your quiz content is sent to Groq's API for processing
- Groq's privacy policy applies: https://groq.com/privacy-policy/
- Generated quizzes are stored in your Supabase database
- No quiz data is retained by Groq after generation

---

## ⚙️ Configuration

### Environment Variables

```env
# Required for AI Quiz Generation
VITE_GROQ_API_KEY=gsk_your_api_key_here
```

### For Local Development:
1. Create/edit `.env` file in project root
2. Add the `VITE_GROQ_API_KEY` variable
3. Restart your dev server (`npm run dev`)

### For Vercel Deployment:
1. Go to Vercel Dashboard → Your Project → Settings
2. Navigate to **Environment Variables**
3. Add:
   - **Key**: `VITE_GROQ_API_KEY`
   - **Value**: Your Groq API key
   - **Environment**: Production, Preview, Development
4. Redeploy your application

---

## 🐛 Troubleshooting

### "Failed to generate quiz with AI"

**Possible Causes:**
1. **Missing API Key**: Check if `VITE_GROQ_API_KEY` is set
2. **Invalid API Key**: Verify your key is correct and active
3. **Rate Limit**: Free tier has usage limits (check Groq dashboard)
4. **Network Issues**: Check your internet connection

**Solutions:**
- Verify API key in `.env` file or Vercel settings
- Check browser console for detailed error messages
- Try again with fewer questions
- Ensure dev server was restarted after adding env variable

### Generated Questions Are Inaccurate

**Solutions:**
- Provide more detailed topic descriptions
- Include specific learning objectives in your notes
- Review and manually edit questions after generation
- Try different difficulty levels
- Regenerate if results are unsatisfactory

### Generation Takes Too Long

**Causes:**
- Requesting many questions (50+)
- Complex topic requiring more processing
- API server load

**Solutions:**
- Generate in smaller batches (10-20 questions at a time)
- Use simpler topic descriptions
- Check Groq status page for outages

---

## 💡 Tips & Tricks

### 1. **Batch Generation**
Generate multiple quiz versions by:
- Running the AI generator multiple times with different difficulty levels
- Combining manual and AI-generated questions

### 2. **Study Notes to Quiz**
Perfect for teachers:
- Copy lecture notes or textbook excerpts
- Paste into the AI generator
- Get instant comprehension questions

### 3. **Topic Expansion**
Start with a broad topic, then:
- Review generated questions
- Identify subtopics
- Generate additional focused quizzes

### 4. **Quality Control Workflow**
1. Generate quiz with AI
2. Preview the quiz
3. Edit any unclear questions
4. Test yourself before sharing with students
5. Adjust difficulty if needed

---

## 📊 Limitations

- **Accuracy**: AI may occasionally generate incorrect answers - always review
- **Context**: AI doesn't know your specific curriculum - provide detailed notes
- **Creativity**: Questions follow standard multiple-choice format
- **Language**: Currently optimized for English content
- **Rate Limits**: Free tier has usage caps (check Groq pricing)

---

## 🔮 Future Enhancements

Planned features:
- Support for True/False questions
- Image-based questions
- Multiple correct answers support
- Question difficulty auto-detection
- Bulk quiz generation from PDFs
- Multi-language support

---

## 📞 Support

If you encounter issues with AI generation:
1. Check this documentation
2. Verify your API key configuration
3. Review browser console errors
4. Check Groq API status: https://status.groq.com
5. Contact support with error details

---

## 🎓 Example Use Cases

### 1. **Quick Assessment Creation**
```
Topic: "Functions in Python"
Questions: 10
Difficulty: Easy
Result: Instant quiz for beginner programmers
```

### 2. **Study Material Conversion**
```
Paste: 3 paragraphs about the French Revolution
Questions: 15
Difficulty: Medium
Result: Comprehensive quiz covering all key points
```

### 3. **Exam Preparation**
```
Topic: "Organic Chemistry Reactions"
Questions: 25
Difficulty: Hard
Result: Challenging practice test for students
```

---

**Happy Quiz Creating! 🎉**

For general QuizMaster usage, see [USER_GUIDE.md](USER_GUIDE.md)
