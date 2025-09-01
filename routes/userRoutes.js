const { Router } = require("express");
const {
  registerUser,
  loginUser,
  updateUser,
} = require("../controllers/userControllers");
const authGuard = require("../middlewares/authGuard");
const router = Router();

router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  console.log("Registering user:", username, password);
  try {
    const user = await registerUser(username, password);
    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(400).json({ errorMessage: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Login user:", username, password);

  try {
    const { token, userId, profileImage } = await loginUser(username, password);
    res.status(200).json({ message: "Login successful", token, userId, profileImage });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ errorMessage: error.message });
  }
});

router.put("/update/:id", authGuard, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  console.log(id, updates);
  try {
    const updatedUser = await updateUser(id, updates);
    console.log("User updated:", updatedUser);
    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    res.status(400).json({ errorMessage: error.message });
  }
});

module.exports = { router };
