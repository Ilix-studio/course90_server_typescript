import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import { SuperAdmin } from "../../models/auth/superAdminModel";
import { Principal } from "../../models/auth/principalModel";
import { Teacher } from "../../models/auth/teacherModel";
import { ISuperAdminDocument } from "../../types/auth.types";
import { UserRole } from "../../constants/enums";

// Generate JWT token
const generateToken = (id: string, role: UserRole): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not defined");

  return jwt.sign({ id, role }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
};

// @desc    Login SuperAdmin
// @route   POST /api/superadmin/login
// @access  Public
export const loginSuperAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Email and password are required");
    }

    // Find SuperAdmin
    const superAdmin = await SuperAdmin.findOne({
      email,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    }).select("+password");

    if (!superAdmin || !(await superAdmin.comparePassword(password))) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    // Generate token
    const token = generateToken(superAdmin.id.toString(), UserRole.SUPER_ADMIN);

    // Set cookie options
    const cookieOptions = {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
    };

    const responseData = {
      id: superAdmin.id.toString(),
      name: superAdmin.name,
      email: superAdmin.email,
      role: superAdmin.role,
    };

    res
      .status(200)
      .cookie("superAdminToken", token, cookieOptions)
      .json({
        success: true,
        message: "Login successful",
        data: {
          superAdmin: responseData,
          token,
        },
      });
  }
);

// @desc    Logout SuperAdmin
// @route   POST /api/superadmin/logout
// @access  Private
export const logoutSuperAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    res.cookie("superAdminToken", "", {
      httpOnly: true,
      expires: new Date(0),
    });

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  }
);

// @desc    Get Dashboard Analytics
// @route   GET /api/superadmin/dashboard
// @access  Private (SuperAdmin only)
export const getDashboardAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Get total institutes registered
      const totalInstitutes = await Principal.countDocuments({
        role: UserRole.PRINCIPAL,
      });

      // Get active institutes
      const activeInstitutes = await Principal.countDocuments({
        role: UserRole.PRINCIPAL,
        isActive: true,
      });

      // Get total teachers
      const totalTeachers = await Teacher.countDocuments({
        role: UserRole.TEACHER,
      });

      // Get active teachers
      const activeTeachers = await Teacher.countDocuments({
        role: UserRole.TEACHER,
        isActive: true,
      });

      // Get institutes registered this month
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const institutesThisMonth = await Principal.countDocuments({
        role: UserRole.PRINCIPAL,
        createdAt: { $gte: currentMonth },
      });

      // Get teachers joined this month
      const teachersThisMonth = await Teacher.countDocuments({
        role: UserRole.TEACHER,
        createdAt: { $gte: currentMonth },
      });

      // Get recent institutes (last 5)
      const recentInstitutes = await Principal.find({
        role: UserRole.PRINCIPAL,
      })
        .select("instituteName email createdAt isActive instituteType")
        .sort({ createdAt: -1 })
        .limit(5);

      // Get institute types distribution
      const instituteTypeStats = await Principal.aggregate([
        { $match: { role: UserRole.PRINCIPAL } },
        { $group: { _id: "$instituteType", count: { $sum: 1 } } },
      ]);

      // Calculate growth rate (compared to previous month)
      const previousMonth = new Date();
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      previousMonth.setDate(1);
      previousMonth.setHours(0, 0, 0, 0);

      const institutesLastMonth = await Principal.countDocuments({
        role: UserRole.PRINCIPAL,
        createdAt: {
          $gte: previousMonth,
          $lt: currentMonth,
        },
      });

      const instituteGrowthRate =
        institutesLastMonth > 0
          ? (
              ((institutesThisMonth - institutesLastMonth) /
                institutesLastMonth) *
              100
            ).toFixed(2)
          : "0";

      const dashboardData = {
        overview: {
          totalInstitutes,
          activeInstitutes,
          totalTeachers,
          activeTeachers,
          institutesThisMonth,
          teachersThisMonth,
          instituteGrowthRate: `${instituteGrowthRate}%`,
        },
        charts: {
          instituteTypeDistribution: instituteTypeStats,
        },
        recentActivity: {
          recentInstitutes,
        },
        // Placeholder for future passkey and payment data
        passkeys: {
          totalGenerated: 0, // TODO: Implement when passkey model is ready
          totalPaid: 0, // TODO: Implement when payment model is ready
          activePasskeys: 0, // TODO: Implement when student model is ready
        },
        users: {
          totalPrincipals: activeInstitutes,
          totalTeachers: activeTeachers,
          totalStudents: 0, // TODO: Implement when student model is ready
          totalActiveUsers: activeInstitutes + activeTeachers,
        },
      };

      res.json({
        success: true,
        message: "Dashboard analytics retrieved successfully",
        data: dashboardData,
      });
    } catch (error) {
      res.status(500);
      throw new Error("Error fetching dashboard analytics");
    }
  }
);

// @desc    Get All Institutes
// @route   GET /api/superadmin/institutes
// @access  Private (SuperAdmin only)
export const getAllInstitutes = asyncHandler(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const skip = (page - 1) * limit;

    // Build search query
    let searchQuery: any = { role: UserRole.PRINCIPAL };
    if (search) {
      searchQuery.$or = [
        { instituteName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const institutes = await Principal.find(searchQuery)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalInstitutes = await Principal.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalInstitutes / limit);

    res.json({
      success: true,
      message: "Institutes retrieved successfully",
      data: {
        institutes,
        pagination: {
          currentPage: page,
          totalPages,
          totalInstitutes,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  }
);

// @desc    Get All Teachers
// @route   GET /api/superadmin/teachers
// @access  Private (SuperAdmin only)
export const getAllTeachers = asyncHandler(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const skip = (page - 1) * limit;

    // Build search query
    let searchQuery: any = { role: UserRole.TEACHER };
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { applicationId: { $regex: search, $options: "i" } },
      ];
    }

    const teachers = await Teacher.find(searchQuery)
      .populate("instituteId", "instituteName")
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalTeachers = await Teacher.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalTeachers / limit);

    res.json({
      success: true,
      message: "Teachers retrieved successfully",
      data: {
        teachers,
        pagination: {
          currentPage: page,
          totalPages,
          totalTeachers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  }
);

// @desc    Toggle Institute Status
// @route   PUT /api/superadmin/institute/:id/toggle-status
// @access  Private (SuperAdmin only)
export const toggleInstituteStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const institute = await Principal.findById(id);
    if (!institute) {
      res.status(404);
      throw new Error("Institute not found");
    }

    institute.isActive = !institute.isActive;
    await institute.save();

    res.json({
      success: true,
      message: `Institute ${
        institute.isActive ? "activated" : "deactivated"
      } successfully`,
      data: {
        id: institute._id,
        isActive: institute.isActive,
      },
    });
  }
);

// @desc    Get SuperAdmin Profile
// @route   GET /api/superadmin/profile
// @access  Private (SuperAdmin only)
export const getSuperAdminProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const superAdmin = req.user as ISuperAdminDocument;

    res.json({
      success: true,
      message: "Profile retrieved successfully",
      data: {
        id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
        createdAt: superAdmin.createdAt,
      },
    });
  }
);
