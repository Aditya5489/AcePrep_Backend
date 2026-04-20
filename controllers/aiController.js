
const Groq = require("groq-sdk");
const {
  questionAnswerPrompt,
  conceptExplainPrompt,
} = require("../utils/prompts");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const extractJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch (e) {}

  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error("Invalid JSON from AI");

  return JSON.parse(match[0]);
};

const generateInterviewQuestions = async (req, res) => {
  try {
    const { role, experience, topicsToFocus, numberOfQuestions } = req.body;

    if (!role || experience == null || !topicsToFocus || !numberOfQuestions) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const prompt = questionAnswerPrompt({
      role,
      experience,
      topicsToFocus,
      numberOfQuestions,
    });

    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content:
            "Return ONLY valid JSON array. No markdown. No explanation.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
    });

    const rawText = completion.choices[0].message.content;

    const cleanedText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const data = extractJSON(cleanedText);

    res.status(200).json(data);
  } catch (error) {
    console.error("Groq Error:", error);
    res.status(500).json({
      message: "Failed to generate questions",
      error: error.message,
    });
  }
};

const generateConceptExplaination = async (req, res) => {
  try {
    const { concept } = req.body;

    if (!concept) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const prompt = conceptExplainPrompt({ concept });

    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content:
            "Return ONLY valid JSON object. No markdown. No explanation.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
    });

    const rawText = completion.choices[0].message.content;

    const cleanedText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const data = extractJSON(cleanedText);

    res.status(200).json(data);
  } catch (error) {
    console.error("Groq Error:", error);
    res.status(500).json({
      message: "Failed to generate explanation",
      error: error.message,
    });
  }
};

module.exports = {
  generateInterviewQuestions,
  generateConceptExplaination,
};