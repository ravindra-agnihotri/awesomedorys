const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ---------- STATIC FRONTEND ----------
app.use(express.static("public"));

// ---------- SERVE IMAGES ----------
app.use("/uploads", express.static("uploads"));

// ---------- FOLDERS ----------
const DATA_DIR = "data";
const PRODUCT_JSON = path.join(DATA_DIR, "products.json");
const GALLERY_JSON = path.join(DATA_DIR, "gallery.json");
const REVIEW_JSON = path.join(DATA_DIR, "reviews.json");
const ABOUT_JSON = path.join(DATA_DIR, "about.json");

if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if(!fs.existsSync(PRODUCT_JSON)) fs.writeFileSync(PRODUCT_JSON, "[]");
if(!fs.existsSync(GALLERY_JSON)) fs.writeFileSync(GALLERY_JSON, "[]");
if(!fs.existsSync(REVIEW_JSON)) fs.writeFileSync(REVIEW_JSON, "[]");

if(!fs.existsSync(ABOUT_JSON)) fs.writeFileSync(
    ABOUT_JSON,
    JSON.stringify({
        title:"About Dory's Bakehouse",
        description:"At Dory’s Bakehouse, every cake is baked with love, passion, and premium ingredients.",
        description2:"Freshly prepared, beautifully decorated, and irresistibly delicious – crafted to bring smiles."
    }, null, 2)
);

const PRODUCT_DIR = "uploads/products";
const GALLERY_DIR = "uploads/gallery";

[PRODUCT_DIR, GALLERY_DIR].forEach(dir => {
    if(!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true});
});

// ---------- MULTER ----------
const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
        if(req.url.includes("gallery")) cb(null, GALLERY_DIR);
        else cb(null, PRODUCT_DIR);
    },
    filename:(req,file,cb)=>{
        cb(null, Date.now() + "_" + file.originalname);
    }
});
const upload = multer({storage});

// ---------- UTILS ----------
const readJSON = file => JSON.parse(fs.readFileSync(file));
const writeJSON = (file,data) => fs.writeFileSync(file, JSON.stringify(data,null,2));


// ======================= PRODUCTS =======================
app.get("/api/products",(req,res)=>{
    res.json(readJSON(PRODUCT_JSON));
});

app.post("/api/products", upload.single("image"), (req,res)=>{

    if(!req.file){
        return res.status(400).json({message:"Image is required"});
    }

    const list = readJSON(PRODUCT_JSON);
    const id = list.length ? list[list.length-1].id + 1 : 1;

    const product = {
        id,
        name: req.body.name,
        price: req.body.price,
        description: req.body.description,
        imageUrl: "/uploads/products/" + req.file.filename
    };

    list.push(product);
    writeJSON(PRODUCT_JSON, list);

    res.json(product);
});

app.delete("/api/products/:id",(req,res)=>{
    let list = readJSON(PRODUCT_JSON);
    list = list.filter(p => p.id != req.params.id);
    writeJSON(PRODUCT_JSON, list);
    res.json({message:"Product Deleted"});
});


// ======================= GALLERY =======================
app.get("/api/gallery",(req,res)=>{
    res.json(readJSON(GALLERY_JSON));
});

app.post("/api/gallery", upload.array("files"), (req,res)=>{

    if(!req.files || req.files.length === 0){
        return res.status(400).json({message:"No files uploaded"});
    }

    const list = readJSON(GALLERY_JSON);
    let lastId = list.length ? list[list.length-1].id : 0;

    req.files.forEach(file=>{
        lastId++;
        list.push({
            id:lastId,
            url: "/uploads/gallery/" + file.filename
        });
    });

    writeJSON(GALLERY_JSON, list);
    res.json(list);
});

app.delete("/api/gallery/:id",(req,res)=>{
    let list = readJSON(GALLERY_JSON);
    list = list.filter(g => g.id != req.params.id);
    writeJSON(GALLERY_JSON, list);
    res.json({message:"Image Deleted"});
});


// ======================= REVIEWS =======================
app.get("/api/reviews",(req,res)=>{
    res.json(readJSON(REVIEW_JSON));
});

app.post("/api/reviews",(req,res)=>{
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

    res.json({success:true, review});
});


// ======================= ABOUT =======================
app.get("/api/about",(req,res)=>{
    res.json(readJSON(ABOUT_JSON));
});

app.post("/api/about",(req,res)=>{
    const data = {
        title: req.body.title,
        description: req.body.description,
        description2: req.body.description2
    };
    writeJSON(ABOUT_JSON, data);
    res.json({message:"About Updated", data});
});


// ======================= ROUTES =======================
app.get("/", (req,res)=>{
    res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/admin", (req,res)=>{
    res.sendFile(path.join(__dirname, "public/admin.html"));
});


// ======================= START =======================
const PORT = 8080;
app.listen(PORT, ()=> console.log("Backend running on http://localhost:" + PORT));
