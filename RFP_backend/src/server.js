import app from './app.js';   // use import instead of require

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log("Server running on port", port);
});
