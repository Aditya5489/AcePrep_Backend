const { OpenRouter } = require("@openrouter/sdk");
const { questionAnswerPrompt, conceptExplainPrompt } = require("../utils/prompts");

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

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

    const completion = await openrouter.chat.send({
      chatGenerationParams: {
        model: "openai/gpt-oss-120b:free",
        messages: [
          {
            role: "system",
            content:
              "You are an AI that generates structured JSON interview questions only. Return strictly valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      },
    });

    const rawText = completion.choices[0].message.content;

    const cleanedText = rawText
      .replace(/^```json/, "")
      .replace(/```$/, "")
      .trim();

    const data = JSON.parse(cleanedText);

    res.status(200).json(data);
  } catch (error) {
    console.error("OpenRouter Error:", error);
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

    const completion = await openrouter.chat.send({
      chatGenerationParams: {
        model: "openai/gpt-oss-120b:free",
        messages: [
          {
            role: "system",
            content:
              "You explain concepts in structured JSON format only. Return strictly valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      },
    });

    const rawText = completion.choices[0].message.content;

    const cleanedText = rawText
      .replace(/^```json/, "")
      .replace(/```$/, "")
      .trim();

    const data = JSON.parse(cleanedText);

    res.status(200).json(data);
  } catch (error) {
    console.error("OpenRouter Error:", error);
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
