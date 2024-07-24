const uuid = require('uuid')
const express = require('express')
const util = require('util')
const sessions = require('./db/sessions')

const {
    GoogleGenerativeAI,
    // HarmCategory,
    // HarmBlockThreshold,
} = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
});

const generationConfig = {
    // temperature: 1,
    temperature: .2,
    topP: 0.95,
    // topK: 64,
    topK: 2,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",

};

const app = express()

app.use(express.json())

app.get('/token', async (req, res) => {
    const token = uuid.v4()
    sessions[token] = []

    return res.status(200).json({
        token: token,
    })
})

app.get('/message', async (req, res) => {
    if (!req.body.token) {
        return res.status(400).json({
            message: 'token is required'
        })
    }

    const histories = sessions[req.body.token]
    if (!histories) {
        return res.status(400).json({
            message: 'generate token first'
        })
    }

    const chats = histories.map(hist => ({
        role: hist.role,
        chat: hist.parts[0].text,
    }))

    return res.status(200).json({
        chats: chats
    })
})

app.post('/message', async (req, res) => {
    if (!req.body.token) {
        return res.status(400).json({
            message: 'token is required'
        })
    }

    const histories = sessions[req.body.token]
    // console.log(util.inspect(histories, false, null, true /* enable colors */))
    if (!histories) {
        return res.status(400).json({
            message: 'generate token first'
        })
    }

    const chatSession = model.startChat({
        generationConfig,
        history: histories,
    })

    const result = await chatSession.sendMessage(req.body.message);

    sessions[req.body.token] = histories

    return res.status(200).json({
        reply: result.response.text()
    })
})

app.listen(3000, () => {
    console.log('App listening on port 3000')
})