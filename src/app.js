import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";
//-configuration-
const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();
//-connection to MongoDB-
const mongoClient = new MongoClient(process.env.DATABASE_URL);
try {
    await mongoClient.connect();
    console.log("MongoDB is online, Berk!");
} catch (error) {
    console.log(error);
}
const db = mongoClient.db();
//-joi schema validations-
const participantsSchema = joi.object({ name: joi.string().required() });
const messagesSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message").required()
});


//-participants-
app.post("/participants", async (req, res) => {
    const validation = participantsSchema.validate(req.body);
    if (validation.error) return res.sendStatus(422);
    const { name } = req.body;

    try {
        const user = await db.collection("participants").findOne({ name: name });
        if (user) return res.sendStatus(409);
        await db.collection("participants").insertOne({ name, lastStatus: Date.now() });
        const statusMessage = {
            from: name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time: dayjs().format("HH:mm:ss")
        };
        await db.collection("messages").insertOne(statusMessage);
        return res.sendStatus(201);
    } catch (error) {
        return res.status(500).send(error.message);
    }
});

app.get("/participants", async (req, res) => {

    try {
        const onlineUsers = await db.collection("participants").find().toArray();
        return res.status(200).send(onlineUsers);

    } catch (error) {
        return res.status(500).send(error.message);
    }
});

//-messages-
app.post("/messages", async (req, res) => {

    const validation = messagesSchema.validate(req.body);
    if (validation.error) return res.sendStatus(422);
    const { to, text, type } = req.body;
    const { user } = req.headers;

    try {
        const chatMessage = {
            from: user,
            to: to,
            text: text,
            type: type,
            time: dayjs().format("HH:mm:ss")
        };
        const isUserOnline = await db.collection("participants").findOne({ name: user });
        if (!isUserOnline) return res.sendStatus(422);
        await db.collection("messages").insertOne(chatMessage);
        return res.sendStatus(201);
    } catch (error) {
        return res.status(500).send(error.message);
    }
});

app.get("/messages", async (req, res) => {
    const { user } = req.headers;
    const amount = parseInt(req.query.limit);
    console.log(amount);
    if (amount <= 0 || !amount) return res.sendStatus(422);

    try {
        const chatMessages = await db.collection("messages")
            .find({ $or: [{ from: user }, { to: user }, { to: "Todos" }, { type: "message" }] })
            .sort({ $natural: -1 }).limit(amount)
            .toArray();
        return res.status(200).send(chatMessages);
    } catch (error) {
        return res.status(500).send(error.message);
    }
});

//-status-
app.post("/status", async (req, res) => {
    const { user } = req.headers;
    if (!user) return res.sendStatus(404);
    try {
        const isUserOnline = await db.collection("participants").findOne({ name: user });
        if (!isUserOnline) return res.sendStatus(404);
        await db.collection("participants").updateOne({ name: user }, { $set: { name: user, lastStatus: Date.now() } });
        return res.sendStatus(200);
    } catch (error) {
        return res.status(500).send(error.message);
    }
});

async function removeUsers() {
    try {
        await db.collection("participants").deleteMany({ lastStatus: { $lt: Date.now() - 10000 } });
        console.log("removing berks...");
    } catch (error) {
        console.log(error);
    }
}

setInterval(removeUsers, 15000);

//-connection-
const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));