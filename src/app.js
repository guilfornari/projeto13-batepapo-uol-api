import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
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

//-participants-
app.post("/participants", async (req, res) => {
    const validation = participantsSchema.validate(req.body)
    if (validation.error) return res.sendStatus(422);
    const { name } = req.body;

    try {
        const user = await db.collection("participants").findOne({ name: name });
        if (user) return res.sendStatus(409);
        await db.collection("participants").insertOne({ name, lastStatus: Date.now() });
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

//-connection-
const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));