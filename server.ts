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

  // API Route to get username suggestions
  app.get("/api/search-suggestions", async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.length < 2) return res.json({ users: [] });

    try {
      const response = await axios.get(`https://www.instagram.com/web/search/topsearch/?context=blended&query=${q}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "X-IG-App-ID": "936619743392459"
        },
        timeout: 3000
      });

      const users = response.data.users?.map((item: any) => {
        const u = item?.user;
        if (!u) return null;
        return {
          username: u.username,
          fullName: u.full_name,
          avatar: u.profile_pic_url,
          isVerified: u.is_verified
        };
      }).filter(Boolean) || [];

      res.json({ users });
    } catch (error) {
      res.json({ users: [] });
    }
  });

  // API Route to fetch Instagram Profile Data
  app.post("/api/fetch-profile", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Username or URL is required" });

    try {
      // Extract username from URL or use as-is if it's just a handle
      let username = url.trim().replace(/^@/, "");
      const urlMatch = username.match(/(?:instagram\.com\/|instagr\.am\/)([a-zA-Z0-9_.]+)/);
      if (urlMatch) {
         username = urlMatch[1];
      }
      username = username.split('?')[0].replace(/\/$/, ""); 

      let profileData = null;
      let mediaData = [];

      // Real extraction attempt
      try {
        const response = await axios.get(`https://www.instagram.com/${username}/?__a=1&__d=dis`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "X-IG-App-ID": "936619743392459",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
          },
          timeout: 5000
        });

        if (response.data?.graphql?.user) {
          const user = response.data.graphql.user;
          
          if (user.is_private) {
            return res.status(403).json({ 
              error: "PRIVATE_ACCOUNT", 
              message: `@${username} is a private account. Instagram prevents public access to private data.`,
              username 
            });
          }

          profileData = {
            username: user.username || username,
            fullName: user.full_name || username,
            bio: user.biography || "",
            avatar: user.profile_pic_url_hd || user.profile_pic_url,
            followers: user.edge_followed_by?.count || 0,
            following: user.edge_follow?.count || 0,
            postCount: user.edge_owner_to_timeline_media?.count || 0
          };
          mediaData = (user.edge_owner_to_timeline_media?.edges || []).map((edge: any) => ({
            id: edge.node?.id || Math.random().toString(),
            url: edge.node?.display_url,
            isVideo: !!edge.node?.is_video,
            videoUrl: edge.node?.video_url || null,
            caption: edge.node?.edge_media_to_caption?.edges[0]?.node?.text || "",
            type: edge.node?.is_video ? "Reel" : "Post",
            likes: edge.node?.edge_liked_by?.count || 0,
            comments: edge.node?.edge_media_to_comment?.count || 0
          }));
          
          return res.json({ profile: profileData, media: mediaData });
        } else {
           throw new Error("NOT_FOUND");
        }
      } catch (e: any) {
        const status = e.response?.status;
        
        if (status === 404) {
          return res.status(404).json({ error: "USER_NOT_FOUND", message: `Instagram user "@${username}" was not found.` });
        }
        
        if (status === 429) {
          return res.status(429).json({ 
            error: "RATE_LIMITED", 
            message: "Instagram is temporarily blocking requests (Rate Limited). Enabling Intelligent Simulation Mode to show preview.",
            username
          });
        }

        // Enhanced Simulation Mode / Fallback
        console.warn(`Real fetch failed (Status: ${status || 'Timeout'}). Using high-fidelity simulation.`);
        
        profileData = {
          username: username,
          fullName: username.split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
          bio: `Digital Creator • Visual Storyteller\nSharing perspectives through a unique lens.\n✨ Explore more at the link below.`,
          avatar: `https://ui-avatars.com/api/?name=${username}&background=random&color=fff&size=200`,
          followers: Math.floor(Math.random() * 50000) + 5000,
          following: Math.floor(Math.random() * 1000) + 100,
          postCount: 15,
          isSimulated: true,
          simReason: status === 429 ? "Rate limited by Instagram" : "Access Restricted"
        };

        mediaData = Array.from({ length: 15 }).map((_, i) => {
          const type = i % 4 === 0 ? 'Reel' : 'Post';
          return {
            id: `sim_${i}`,
            url: `https://picsum.photos/seed/${username}_${i}/800/1000`,
            isVideo: type === 'Reel',
            videoUrl: type === 'Reel' ? "https://www.w3schools.com/html/mov_bbb.mp4" : null,
            caption: `A beautiful capture from @${username}'s collection. #${type.toLowerCase()}`,
            type: type,
            likes: Math.floor(Math.random() * 8000),
            comments: Math.floor(Math.random() * 300)
          };
        });

        return res.json({ profile: profileData, media: mediaData, warning: "Using Simulation Mode due to Instagram access restrictions." });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Check server logs for details." });
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
