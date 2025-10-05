const { Router } = require("express");
const jwt = require("jsonwebtoken");
const {
  registerUser,
  loginUser,
  updateUser,
  refreshTokenExists,
  logoutUser,
} = require("../controllers/userControllers");
const { authGuard } = require("../middlewares/authGuard");
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

  try {
    const { accessToken, refreshToken, userId, profileImage } = await loginUser(
      username,
      password
    );
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd, // HTTPS apenas em produção
      sameSite: isProd ? "none" : "lax", // evita bloqueio em localhost
      domain: isProd ? process.env.DOMAIN : undefined, // só aplica domínio em prod
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
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

router.post("/logout", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  logoutUser(refreshToken);
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    domain:
      process.env.NODE_ENV === "production" ? process.env.DOMAIN : undefined,
    path: "/",
  });
  console.log("User logged out, refresh token removed:", refreshToken);
  res.status(200).json({ message: "Logout successful" });
});

router.post("/refresh", (req, res) => {
  const token = req.cookies.refreshToken;
  console.log("Cookies recebidos no refresh:", req.cookies);
  console.log("Refresh token received:", token);
  if (!token || !refreshTokenExists(token)) {
    return res.status(401).json({ message: "Refresh token inválido" });
  }

  jwt.verify(token, process.env.REFRESH_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token expirado" });
    const accessToken = jwt.sign({ id: user.id }, process.env.ACCESS_SECRET, {
      expiresIn: "20s",
    });
    res.json({ accessToken });
  });
});

module.exports = { router };
