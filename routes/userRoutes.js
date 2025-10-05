const { Router } = require("express");
const {
  registerUser,
  loginUser,
  updateUser,
  logoutUser,
  refreshToken,
} = require("../controllers/userControllers");
const { authGuard } = require("../middlewares/authGuard");
const router = Router();

router.post("/register", async (req, res) => {
  const { username, password } = req.body;
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
  console.log("Login attempt for user:", username);
  try {
    const { accessToken, refreshToken, userId, profileImage } = await loginUser(
      username,
      password
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true, // obrigatório se SameSite=None
      sameSite: "none", // permite cross-site
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      path: "/",
    });
    res.status(200).json({
      message: "Login successful",
      accessToken,
      userId,
      profileImage,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ errorMessage: error.message });
  }
});

router.put("/update/:id", authGuard, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const updatedUser = await updateUser(id, updates);
    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    res.status(400).json({ errorMessage: error.message });
  }
});

router.post("/logout", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  logoutUser(refreshToken);
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,       // obrigatório se SameSite=None
    sameSite: 'none',   // permite cross-site
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    path: '/',
  });
  res.status(204).json({ message: "Logout successful" });
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies.refreshToken;
  try {
    const accessToken = await refreshToken(token);
    res.status(200).json({ accessToken });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
});

module.exports = { router };
