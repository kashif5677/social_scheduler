import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { cloudinary } from "../config/cloudinary.js";
import { Generation } from "../models/Generation.js";
import { Post } from "../models/Post.js";

// Generate AI Post
export const generatePost = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { prompt, tone, generateImage } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      res.status(400).json({
        message: "Gemini API key missing.",
      });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    const textResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate a social media post based on this prompt: "${prompt}".
Tone: ${tone}.
Include relevant hashtags.
Return JSON with:
{
  "content":"",
  "imagePrompt":""
}`,
    });

    let content = "";
    let imagePrompt = prompt;

    try {
      const rawText = textResponse.text || "";
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);

      const data = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : {
            content: rawText,
            imagePrompt: prompt,
          };

      content = data.content;
      imagePrompt = data.imagePrompt;
    } catch {
      content = textResponse.text || "";
    }

    let mediaUrl = "";
    if (generateImage) {
      try {
        console.log("========== GENERATING IMAGE ==========");

        // Generate image using Pollinations AI
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
          imagePrompt,
        )}?width=1080&height=1350&nologo=true&enhance=true`;

        console.log("Pollinations URL:", imageUrl);

        // Upload generated image to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(imageUrl, {
          folder: "ai-generations",
          resource_type: "image",
          transformation: [
            {
              width: 1080,
              height: 1350,
              crop: "fill",
              gravity: "auto",
            },
          ],
        });

        console.log("========== CLOUDINARY SUCCESS ==========");
        console.log(uploadResult.secure_url);

        mediaUrl = uploadResult.secure_url;
      } catch (error: any) {
        console.log("========== IMAGE GENERATION ERROR ==========");
        console.error(error.message);

        if (error.response) {
          console.log(error.response.status);
          console.dir(error.response.data, { depth: null });
        }
      }
    }

    const generation = await Generation.create({
      user: req.user._id,
      prompt,
      content,
      mediaUrl,
      mediaType: mediaUrl ? "image" : undefined,
      tone,
    });

    res.json(generation);
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Server error",
    });
  }
};

// Get AI Generations
export const getGenerations = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const generations = await Generation.find({
      user: req.user._id,
    }).sort({
      createdAt: -1,
    });

    res.json(generations);
  } catch (error: any) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Get Posts
export const getPosts = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const posts = await Post.find({
      user: req.user._id,
    }).sort({
      scheduledFor: 1,
    });

    console.log(posts);

    res.json(posts);
  } catch (error: any) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Schedule Post
export const scheduledPost = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { content, platforms, scheduledFor, status } = req.body;

    let parsedPlatforms = platforms;

    if (typeof platforms === "string") {
      try {
        parsedPlatforms = JSON.parse(platforms);
      } catch {
        parsedPlatforms = platforms.split(",");
      }
    }

    let mediaUrl: string | undefined = req.body.mediaUrl;
    let mediaType: "image" | "video" | undefined = req.body.mediaType;

    if (req.file) {
      console.log("Uploading media to Cloudinary...");

      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

      const result = await cloudinary.uploader.upload(base64Image, {
        folder: "social-scheduler",
        resource_type: "image",

        transformation: [
          {
            width: 1080,
            height: 1350,
            crop: "fill",
            gravity: "auto",
          },
        ],
      });

      mediaUrl = result.secure_url;
      mediaType = "image";
    }

    console.log("Creating Post document...");

    const post = new Post({
      user: req.user._id,
      content,
      platforms: parsedPlatforms,
      mediaUrl,
      mediaType,
      scheduledFor: new Date(scheduledFor),
      status,
    });

    await post.save();

    res.status(201).json(post);
  } catch (error: any) {
    console.error(error);
    console.error(error.stack);

    if (error.errors) {
      console.error(error.errors);
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
