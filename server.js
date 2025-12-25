const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const multer = require("multer");

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const app = express();
app.use(cors());
app.use(express.json());

// ================= CLOUDINARY =================
cloudinary.config({
    cloud_name: "ddxncyyhh",
    api_key: "741968644895871",
    api_secret: "G6Aqnv0cv4FgJBr4-MtYxwUnVtM"
});

// ================= STATIC =================
app.use(express.static("public"));

// ================= DATA FILES =================
const DATA_DIR = "data";
const PRODUCT_JSON = path.join(DATA_DIR, "products.json");
const GALLERY_JSON = path.join(DATA_DIR, "gallery.json");
const REVIEW_JSON = path.join(DATA_DIR, "reviews.json");
const ABOUT_JSON = path.join(DATA_DIR, "about.json");
const TODAY_JSON = path.join(DATA_DIR, "today.json");
if(!fs.existsSync(TODAY_JSON)) fs.writeFileSync(TODAY_JSON, "[]");



if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

if (!fs.existsSync(PRODUCT_JSON)) fs.writeFileSync(PRODUCT_JSON, "[]");
if (!fs.existsSync(GALLERY_JSON)) fs.writeFileSync(GALLERY_JSON, "[]");
if (!fs.existsSync(REVIEW_JSON)) fs.writeFileSync(REVIEW_JSON, "[]");

if (!fs.existsSync(ABOUT_JSON))
    fs.writeFileSync(
        ABOUT_JSON,
        JSON.stringify(
            {
                title: "About Dory's Bakehouse",
                description:
                    "At Dory’s Bakehouse, every cake is baked with love, passion, and premium ingredients.",
                description2:
                    "Freshly prepared, beautifully decorated, and irresistibly delicious – crafted to bring smiles."
            },
            null,
            2
        )
    );

// ================= CLOUDINARY STORAGE =================
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        let folder = "dory-products";
        if (req.url.includes("gallery")) folder = "dory-gallery";
        if (req.url.includes("today")) folder = "dory-today";


        return {
            folder,
            resource_type: "image"
        };
    }
});
const todayStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "dory-today",
        resource_type: "image"
    }
});
const uploadToday = multer({ storage: todayStorage });


const upload = multer({ storage });

// ================= UTIL HELPERS =================
const readJSON = (file) => JSON.parse(fs.readFileSync(file));
const writeJSON = (file, data) =>
    fs.writeFileSync(file, JSON.stringify(data, null, 2));

/* =========================================================
                      PRODUCTS
========================================================= */

app.get("/api/products", (req, res) => {
    res.json(readJSON(PRODUCT_JSON));
});

app.post("/api/products", upload.single("image"), (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: "Product image required" });

        const list = readJSON(PRODUCT_JSON);
        const id = list.length ? list[list.length - 1].id + 1 : 1;

        const product = {
            id,
            name: req.body.name,
            price: req.body.price,
            description: req.body.description,
            imageUrl: req.file.secure_url || req.file.path
        };

        list.push(product);
        writeJSON(PRODUCT_JSON, list);

        res.json(product);
    } catch (err) {
        console.error("PRODUCT ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete("/api/products/:id", (req, res) => {
    let list = readJSON(PRODUCT_JSON);
    list = list.filter((p) => p.id != req.params.id);
    writeJSON(PRODUCT_JSON, list);
    res.json({ message: "Product Deleted" });
});

/* =========================================================
                      GALLERY
========================================================= */

app.get("/api/gallery", (req, res) => {
    res.json(readJSON(GALLERY_JSON));
});

app.post("/api/gallery", upload.array("files"), (req, res) => {
    try {
        if (!req.files || req.files.length === 0)
            return res.status(400).json({ message: "No files uploaded" });

        const list = readJSON(GALLERY_JSON);
        let lastId = list.length ? list[list.length - 1].id : 0;

        req.files.forEach((file) => {
            lastId++;
            list.push({
                id: lastId,
                url: file.path // CLOUDINARY DIRECT URL
            });
        });

        writeJSON(GALLERY_JSON, list);
        res.json(list);
    } catch (err) {
        console.error("GALLERY ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete("/api/gallery/:id", (req, res) => {
    let list = readJSON(GALLERY_JSON);
    list = list.filter((g) => g.id != req.params.id);
    writeJSON(GALLERY_JSON, list);
    res.json({ message: "Image Deleted" });
});

/*======================todays baked======================

--------------------------================================== */
app.get("/api/today", (req,res)=>{
    try{
        const data = JSON.parse(fs.readFileSync(TODAY_JSON));
        res.json(data);
    }catch{
        res.json(null);
    }
});
app.post("/api/today", uploadToday.single("image"), (req,res)=>{

    if(!req.file){
        return res.status(400).json({message:"Image required"});
    }

    const today = {
        id: Date.now(),
        name: req.body.name,
        ingredients: req.body.ingredients,
        imageUrl: req.file.path // CLOUDINARY URL 🎉
    };

    fs.writeFileSync(TODAY_JSON, JSON.stringify(today,null,2));

    res.json(today);
});
app.delete("/api/today",(req,res)=>{
    fs.writeFileSync(TODAY_JSON,"null");
    res.json({message:"Today Bake Cleared"});
});

/* =========================================================
                      REVIEWS
========================================================= */

app.get("/api/reviews", (req, res) => {
    res.json(readJSON(REVIEW_JSON));
});

app.post("/api/reviews", (req, res) => {
    const list = readJSON(REVIEW_JSON);

    const review = {
        id: Date.now(),
        name: req.body.name || "Anonymous",
        message: req.body.message || "",
        rating: req.body.rating || 5,
        date: new Date().toISOString()
    };

    list.unshift(review);
    writeJSON(REVIEW_JSON, list);

    res.json({ success: true, review });
});

/* ==========DELETE REVIEW=============================*/
app.delete("/api/reviews/:id", (req, res) => {
    let list = readJSON(REVIEW_JSON);
    list = list.filter((p) => p.id != req.params.id);
    writeJSON(REVIEW_JSON, list);
    res.json({ message: "Review Deleted" });
});

/* =========================================================
                      ABOUT
========================================================= */

app.get("/api/about", (req, res) => {
    res.json(readJSON(ABOUT_JSON));
});

app.post("/api/about", (req, res) => {
    const data = {
        title: req.body.title,
        description: req.body.description,
        description2: req.body.description2
    };

    writeJSON(ABOUT_JSON, data);
    res.json({ message: "About Updated", data });
});

app.get("/api/today",(req,res)=>{
    res.json(readJSON(TODAY_JSON));
});

app.post("/api/today", upload.single("image"), (req,res)=>{
    const list = readJSON(TODAY_JSON);

    const today = {
        id: Date.now(),
        name: req.body.name,
        description: req.body.description,
        description: req.body.description,
        imageUrl: req.file.path
    };

    list.length = 0;         // always keep ONLY latest
    list.push(today);

    writeJSON(TODAY_JSON, list);
    res.json(today);
});


/* =========================================================
                      ROUTES
========================================================= */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public/admin.html"));
});

/* =========================================================
                      START SERVER
========================================================= */
const PORT = 8080;
app.listen(PORT, () =>
    console.log("Backend Running → http://localhost:" + PORT)
);
