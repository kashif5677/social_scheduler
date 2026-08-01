import cron from "node-cron";
import { Post } from "../models/Post.js";
import { Account } from "../models/Account.js";
import { ActivityLog } from "../models/ActivityLog.js";
import zernio from "../config/zernio.js";

export const initScheduler = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      const postsToPublish = await Post.find({
        status: "scheduled",
        scheduledFor: { $lte: now },
      });

      console.log(`Found ${postsToPublish.length} scheduled post(s).`);

      for (const post of postsToPublish) {
        try {
          const accounts = await Account.find({
            user: post.user,
            platform: { $in: post.platforms },
            status: "connected",
            zernioAccountId: { $exists: true },
          });

          if (accounts.length === 0) {
            console.log("❌ No connected accounts found.");

            post.status = "failed";
            await post.save();

            continue;
          }

          try {
            const accountResult = await zernio.accounts.listAccounts();
          } catch (err) {
            console.log("Unable to fetch Zernio accounts");
            console.error(err);
          }

          const zernioPlatforms = accounts.map((acc) => ({
            platform: acc.platform as any,
            accountId: acc.zernioAccountId!,
          }));

     
          const payload = {
            content: post.content,
            publishNow: true,
            ...(post.mediaUrl
              ? {
                  mediaItems: [
                    {
                      type: post.mediaType || "image",
                      url: post.mediaUrl,
                    },
                  ],
                }
              : {}),
            platforms: zernioPlatforms,
          };

          const response = await zernio.posts.createPost({
            body: payload,
          });

          const zernioPost =
            (response.data as any)?.post ||
            (response.data as any)?.data ||
            response.data;

          const status =
            zernioPost.platforms?.[0]?.status || // processing, published, failed
            zernioPost.status || // publishing, published, etc.
            "";

          if (!zernioPost) {
            throw new Error("Failed to get post object from Zernio response");
          }

          if (["published", "success", "completed"].includes(status)) {
            console.log("✅ Marking MongoDB as published.");

            post.status = "published";
            await post.save();

            await ActivityLog.create({
              user: post.user,
              actionType: "POST_PUBLISHED",
              description: `Published post to ${accounts
                .map((a) => a.platform)
                .join(", ")}`,
              relatedPost: post._id,
            });
          } else if (
            [
              "queued",
              "processing",
              "scheduled",
              "draft",
              "publishing",
            ].includes(status)
          ) {
            // Keep it scheduled so the scheduler can check again later.
            post.status = "scheduled";
            await post.save();
          } else {
            console.log("❌ Zernio returned failed status:", status);

            post.status = "failed";
            await post.save();
          }
        } catch (err: any) {
          // Zernio says this post already exists
          if (err?.statusCode === 409) {
            console.log(
              "✅ Duplicate post detected. It is already published or publishing.",
            );

            post.status = "published";
            await post.save();

            await ActivityLog.create({
              user: post.user,
              actionType: "POST_PUBLISHED",
              description: `Published post to ${accounts
                .map((a) => a.platform)
                .join(", ")}`,
              relatedPost: post._id,
            });

            continue;
          }

          // Other errors
          post.status = "failed";
          await post.save();
        }
      }
    } catch (err) {
      console.error("Scheduler Error:", err);
    }
  });

  console.log("✅ Scheduler service initialized.");
};
