import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import env from "dotenv";
import bcrypt from "bcrypt"


const app = express();
env.config();
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{secure:false,
        httpOnly:true
    }
}));
// app.set("view engine", "ejs");
const port = 4000;
const saltRounds=10;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));


const db= new pg.Client({
    user:process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});
db.connect();

let CurrentUserId=1;

let currlibrary = [];

// let users= [{id:1,userName:"Guest",profilePic:'images/sobek.png'},
//     {id:2,userName:"user1",profilePic:'images/thoth.png'},
//     {id:3,userName:"user2",profilePic:'images/anubis.png'},
// ]

async function getUsers()
{
    let users=[];
    const result= await db.query("select * from users");
    result.rows.forEach(user => {
        users.push({id:user.id,userName:user.username,profilePic:user.profilepic})
        
    });
    return users;
};

async function usersBooks(CurrentUserId){
    let currentUserLibrary=[]
    const result= await db.query("select * from usersbooks where carousel_id=$1",
        [CurrentUserId]
    );
    result.rows.forEach(book=>{
        currentUserLibrary.push({coverUrl:book.bookcover_url,bookId:book.book_id,title:book.title||"Unkown title"});
    });
    return currentUserLibrary;
};

function validPass(password){
    if (password.length<15 && !/\s/.test(password)){
        return true;
    }
    else{
        return false;
    }
}

app.get("/", async (req, res) => {
    const users= await getUsers();
    //  (users);
    let currlibrary = await usersBooks( CurrentUserId);
    //  ("Rendering with User Books:", currlibrary);
    res.render("index.ejs", { addedbooks: currlibrary,users:users });
});

// Fetch the next book ID dynamically
app.get("/getNextBookId", (req, res) => {
    const nextBookId = getNextBookId(); // Generates the next book ID
    res.json({ bookId: nextBookId });
});

// Helper function to generate the next book ID
function createBookIdGenerator() {
    let id = 1; // Starting ID
    return function getNextBookId() {
        const nextId = id.toString().padStart(10, '0'); // Format with leading zeros
        id += 1;  // Increment the counter
        return nextId;
    };
};

app.post("/back",(req,res)=>{
    if(req.body.back==="homePage"){
        res.redirect("/");
    }
    else{
        res.render("useroptions.ejs",{user:req.session.founduser});
    }
})

app.post("/user", async (req, res) => {
    if (req.body.add === "new") {
        res.render("new.ejs");
    }
    else if(req.body.add==="settings"){
        res.render("verifyuser.ejs");
    }
    else {
        CurrentUserId=req.body.user;
         (CurrentUserId);
        res.redirect("/");
    }
});

app.post("/new", async (req, res) => {
    let UserName = req.body.name;
    let ProfilePic = req.body.userPic;
    let Password = req.body.password;
    const error="Password must be less than 15 letters without whitespaces";

    if(validPass(Password)){
        try {
            const hashedPassword=await bcrypt.hash(Password,saltRounds);
             (hashedPassword);
            const result = await db.query(
                "Insert into users (username,profilepic,password) values($1,$2,$3) returning *;",
                [UserName,ProfilePic,hashedPassword]
            );
            const id= result.rows[0].id;
            CurrentUserId=id;
             ("in the new validpass check",CurrentUserId);
        } catch (err) {
            return res.render("new.ejs",{error:error});   
        }
    }
    else{
        
        return res.render("new.ejs",{error:error});  
    }
    //  (newUser);
    //  (CurrentUserId);
    res.redirect("/");
});

app.post("/verifyuser",async (req,res)=>{
    const{username,password}=req.body;
    try{
        const result= await db.query("select username,password from users where username = $1 ",[username]);
        const activeUser=result.rows[0].username;
        const activePass=result.rows[0].password;

        const match = bcrypt.compareSync(password,activePass);

        if(activeUser && match)
            {
                let users=await getUsers();
                let founduser=users.find((user)=>user.userName===activeUser);
                req.session.founduser=founduser;
                res.render("useroptions.ejs",{user:founduser});
            }    
        else{
            res.render("verifyuser.ejs",{error:"Either Username or Password is wrong"})
            }
        
    } 
    catch(err){
        res.render("verifyuser.ejs",{error:"Username does not exist"});
    }

});

app.post("/usersettings",(req,res)=>{
    const {option}=req.body;
    req.session.option=option;
    res.render("usersettings.ejs",{user:req.session.founduser,option:option});
})

app.get("/useroptions",(req,res)=>{
    const result=req.session.result;
    res.render("usersettings.ejs",{user:req.session.founduser,option:req.session.option,error:result.message});
})

app.post("/usersettings/:option", async (req,res)=>{
    const option=req.params.option;
    const userId=req.session.founduser.id;
    if(option==="Delete"){
        const {delAccount,sure}=req.body;
        if (delAccount==="yes" && sure==="yes" ){
            try {
                const result = await db.query("Delete from users where id=$1",[userId]);
            } catch (error) {
               return res.json({message:error.message,om:"the error is in the if"});
            }
        }
       return res.redirect("/");
    }
    const response = await axios.patch(`http://localhost:4000/usersettings/${option}`,req.body,
        {
            headers:{
                Cookie: req.headers.cookie
            }
        }
    );
    const result= response.data;
    req.session.result=result;
    return res.redirect("/useroptions");
})

app.patch("/usersettings/:option",async (req,res)=>{
    const option= req.params.option;
    const userId=req.session.founduser.id

    switch (option) {
        case "UserName":
             ("switch username")

            const {newusername}=req.body;
            try {
                const result = await db.query("Update users set username= $1 where id = $2 returning * ",
                    [newusername, userId]
                );
                 (result.rows);
            } catch (error) {
                 (error.message,"it didnt work");
            }
            req.session.founduser.userName=newusername;
            break;
        case "Password":
             ("switch password")
            const {oldpassword,newpassword,reenterpassword}=req.body;
            try {
                const result=await db.query("select password from users where password = $1",[oldpassword]);
                const response=result.rows;
                if (response.length>0){
                     ("password is in the db");
                    if (newpassword===reenterpassword){
                        const changepass= await db.query("Update users set password=$1 where id=$2",[newpassword,userId]);
                        return res.json({message:"Password changed"});
                    }
                    else{
                         ("password don't match")
                        return res.json({message:"The password don't match"});
                    }
                }
                else{
                     ("this is the wrong password");
                    return res.json({message:"Old password is incorrect"});
                    // res.json({error:"Password is incorrect"});
                }
            } catch (error) {
                 (error.message);
                
            }
             (oldpassword,newpassword,reenterpassword);
            break;
        case "Avatar":
             ("switch Avatar")
            const {newUserPic}=req.body;
            try {
                const result=await db.query("Update users set profilepic=$1 where id= $2",[newUserPic,userId]);
                req.session.founduser.profilePic=newUserPic;
            } catch (error) {
                 (message.error);
            }
            break;
        default:
            break;
    }
    res.json({message:"patch route was successful"})
});

const getNextBookId = createBookIdGenerator();

app.post("/AddBook", async (req, res) => {
    const { bookId, title, coverUrl } = req.body;
     ("Received request:", req.body);

    const addedBook = `https://covers.openlibrary.org/b/id/${bookId}-S.jpg`;
    const metadataUrl = `https://covers.openlibrary.org/b/id/${bookId}.json`;

    try {
        const metadataResponse = await axios.get(metadataUrl);
        const metadata = metadataResponse.data || {};

        const newBook = {
            addedBook,
            addedTitle: metadata.title || title || "Unknown Title",
            addedBookUrl: metadata.url || "#"
        };

        currlibrary.push(newBook); // Add to the existing array
        const result = await db.query(
            `Select * from usersbooks 
             where book_id = $1 and carousel_id=$2`, 
            [bookId,CurrentUserId]);
        
             ("this is the resutt rows",result.rows);
        if (result.rows.length>0){
            //  ("in if of addroute")
            try{
                await db.query(`Delete from usersbooks
                     where book_id = $1 and carousel_id=$2`,
                    [bookId,CurrentUserId]
                );
            }
            catch(err){
                 (err);
            }
        }
        else{
            try {
                await db.query(
                    "INSERT INTO usersbooks(carousel_id, bookcover_url, book_id) VALUES ($1, $2, $3);",
                    [CurrentUserId, coverUrl, bookId]
                );
                 ("✅ Book added to database:", newBook);
            } catch (err) {
                console.error("⚠️ Book not added to the database:", err.message);
                // Optionally: return res.status(500).json({ error: "DB insert failed" });
            }
        }

        // ✅ Send response only once
        return res.json(newBook);

    } catch (error) {
        console.error("❌ Error fetching book cover or metadata:", error.message);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Failed to add book" });
        }
    }
});

app.listen(port, () => {
     (`Server running on http://localhost:${port}`);
});




// $2b$10$/0HGhtrrwNhV1U8TR3TOEuns4sAbCYTDKfMYONqE73FWJOmDb9mD6