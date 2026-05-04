import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import JSZip from "jszip";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to fetch Instagram Profile Data
  app.post("/api/fetch-profile", async (req, res) => {
    const { url } = req.body;
    try {
      // Basic extraction of username from URL
      const usernameMatch = url.match(/(?:instagram\.com\/|instagr\.am\/)([a-zA-Z0-9_.]+)/);
      if (!usernameMatch) {
         return res.status(400).json({ error: "Invalid Instagram URL format" });
      }
      const username = usernameMatch[1].replace(/\/$/, ""); // Remove trailing slash if any

      let profileData = null;
      let mediaData = [];
      let isSimulated = false;

      // Real extraction attempt
      try {
        const response = await axios.get(`https://www.instagram.com/${username}/?__a=1&__d=dis`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "X-IG-App-ID": "936619743392459"
          },
          timeout: 4000
        });

        if (response.data?.graphql?.user) {
          const user = response.data.graphql.user;
          profileData = {
            username: user.username,
            fullName: user.full_name,
            bio: user.biography,
            avatar: user.profile_pic_url_hd,
            followers: user.edge_followed_by.count,
            following: user.edge_follow.count,
            postCount: user.edge_owner_to_timeline_media.count
          };
          mediaData = user.edge_owner_to_timeline_media.edges.map((edge: any) => ({
            id: edge.node.id,
            url: edge.node.display_url,
            isVideo: edge.node.is_video,
            videoUrl: edge.node.video_url || null,
            caption: edge.node.edge_media_to_caption.edges[0]?.node.text || "",
            type: edge.node.is_video ? "Reel" : "Post",
            likes: edge.node.edge_liked_by.count,
            comments: edge.node.edge_media_to_comment.count
          }));
        }
      } catch (e) {
        console.warn(`Scraping blocked for ${username}, enabling Simulation Mode.`);
        isSimulated = true;
      }

      // If scraping failed or returned nothing, use the Enhanced Simulator
      if (isSimulated || !profileData) {
        profileData = {
          username: username,
          fullName: username.split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
          bio: `Visual Content Creator & Digital Architect. \nCreative Director at @StudioNova. \n📍 Living in the details.`,
          avatar: `https://ui-avatars.com/api/?name=${username}&background=EB455F&color=fff&size=200`,
          followers: 42800,
          following: 842,
          postCount: 24,
          isSimulated: true
        };

        mediaData = Array.from({ length: 18 }).map((_, i) => {
          const type = i < 6 ? 'Story' : (i % 3 === 0 ? 'Reel' : 'Post');
          return {
            id: `sim_${i}`,
            url: `https://picsum.photos/seed/${username}_${i}/800/1000`,
            isVideo: type !== 'Post',
            videoUrl: type !== 'Post' ? "https://www.w3schools.com/html/mov_bbb.mp4" : null,
            caption: `Captured moment #${i} by ${username} #Photography #DigitalArt`,
            type: type,
            likes: Math.floor(Math.random() * 5000) + 100,
            comments: Math.floor(Math.random() * 200) + 10
          };
        });
      }

      return res.json({ profile: profileData, media: mediaData });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal processing error" });
    }
  });

  // API Route to generate ZIP
  app.post("/api/download-all", async (req, res) => {
    const { media, username } = req.body;
    try {
      const zip = new JSZip();
      const folder = zip.folder(`${username}_media`);

      const downloadPromises = media.map(async (item: any, index: number) => {
        const downloadUrl = item.videoUrl || item.url;
        const extension = item.isVideo ? "mp4" : "jpg";
        try {
          const response = await axios.get(downloadUrl, { responseType: "arraybuffer" });
          folder?.file(`${item.type.toLowerCase()}_${index}.${extension}`, response.data);
        } catch (err) {
          console.error(`Failed to download ${downloadUrl}`);
        }
      });

      await Promise.all(downloadPromises);
      const content = await zip.generateAsync({ type: "nodebuffer" });

      res.set("Content-Type", "application/zip");
      res.set("Content-Disposition", `attachment; filename=${username}_all_media.zip`);
      res.send(content);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate zip" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
