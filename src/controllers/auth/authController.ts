import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Principal } from "../../models/auth/principalModel";
import { Teacher } from "../../models/auth/teacherModel";

import {
  RegisterPrincipalBody,
  CreateTeacherBody,
  InstituteAuthResponse,
  LoginPrincipalBody,
  IPrincipalDocument,
  ITeacherDocument,
  LoginTeacherBody,
} from "../../types/auth.types";
import { sendSMS } from "../../utils/smsService";
import { UserRole } from "../../constants/enums";
import { Subject } from "../../models/course/subjectModel";

// Auth response interface
interface AuthResponse {
  _id: string;
  name: string;
  email?: string;
  role: UserRole;
  token: string;
  instituteId: string;
  applicationId?: string;
}

// JWT token generation
const generateToken = (
  id: string,
  role: UserRole,
  instituteId?: string
): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not defined");

  return jwt.sign({ id, role, instituteId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
};

// Generate unique application ID for teachers
const generateApplicationId = (instituteName: string): string => {
  const prefix = instituteName.substring(0, 3).toUpperCase();
  const randomNumber = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}${randomNumber}`;
};

// Generate random password for teachers
const generateRandomPassword = (): string => {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
};

// @desc    Register Principal (Institute)
export const registerAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      instituteName,
      email,
      password,
      phoneNumber,
      instituteType,
      msmeNumber,
      udiseNumber,
    }: RegisterPrincipalBody = req.body;

    // Check if principal already exists
    const existingPrincipal = await Principal.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    if (existingPrincipal) {
      res.status(400);
      throw new Error(
        "Principal with this email or phone number already exists"
      );
    }

    // Create principal
    const admin = await Principal.create({
      instituteName,
      email,
      password,
      phoneNumber,
      instituteType,
      msmeNumber,
      udiseNumber,
      role: UserRole.PRINCIPAL,
    });

    if (admin) {
      const token = generateToken(admin.id, UserRole.PRINCIPAL);

      const response: InstituteAuthResponse = {
        id: admin.id.toString(),
        name: admin.instituteName,
        email: admin.email,
        role: UserRole.PRINCIPAL,
        token,
      };

      res.status(201).json({
        success: true,
        message: "Principal registered successfully",
        data: response,
      });
    } else {
      res.status(400);
      throw new Error("Invalid principal data");
    }
  }
);

// @desc    Login Admin
export const loginAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { instituteName, email, password }: LoginPrincipalBody = req.body;

  // Validate input
  if (!instituteName || !email || !password) {
    res.status(400).json({
      success: false,
      message: "Your Institute Name, Email and password are required",
    });
    return;
  }

  // Find admin by email and instituteName
  const admin = await Principal.findOne({
    email,
    instituteName,
  }).select("+password");

  if (!admin) {
    res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
    return;
  }

  // Check password using the model's comparePassword method
  const isPasswordValid = await admin.comparePassword(password);

  if (!isPasswordValid) {
    res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
    return;
  }

  // Generate JWT token
  const token = generateToken(admin.id.toString(), UserRole.PRINCIPAL);

  // Set cookie options
  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
  };

  // Remove password from response
  const adminData = {
    id: admin.id.toString(),
    email: admin.email,
    name: admin.instituteName,
    role: admin.role,
  };

  res
    .status(200)
    .cookie("token", token, cookieOptions)
    .json({
      success: true,
      message: "Login successful",
      data: {
        admin: adminData,
        token,
      },
    });
});

// @desc    Create Teacher (by Principal)
// @route   POST /api/auth/teacher/create
// @access  Private (Principal only)
export const createTeacher = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      name,
      phoneNumber,
      assignedSubjects, // Should be an array of ObjectIds
      permissions,
    }: CreateTeacherBody = req.body;
    const principal = req.user as IPrincipalDocument;

    // Debug logging to see what we're receiving
    console.log("Received request body:", {
      name: { value: name, type: typeof name },
      phoneNumber: { value: phoneNumber, type: typeof phoneNumber },
      assignedSubjects: {
        value: assignedSubjects,
        type: typeof assignedSubjects,
        isArray: Array.isArray(assignedSubjects),
      },
      permissions: {
        value: permissions,
        type: typeof permissions,
        isArray: Array.isArray(permissions),
      },
    });

    // Validate required fields with better checking
    if (!name || name.trim() === "") {
      res.status(400);
      throw new Error("Name is required");
    }

    if (
      phoneNumber === undefined ||
      phoneNumber === null ||
      phoneNumber === 0
    ) {
      res.status(400);
      throw new Error("Phone number is required");
    }

    // Convert phoneNumber to number if it's a string, and validate
    let phoneNumberValue: number;
    if (typeof phoneNumber === "string") {
      phoneNumberValue = parseInt(phoneNumber, 10);
    } else if (typeof phoneNumber === "number") {
      phoneNumberValue = phoneNumber;
    } else {
      res.status(400);
      throw new Error("Phone number must be a valid number");
    }

    // Validate phone number format
    if (isNaN(phoneNumberValue) || phoneNumberValue <= 0) {
      res.status(400);
      throw new Error("Valid phone number is required");
    }

    // Validate assignedSubjects format (should be array)
    if (assignedSubjects && !Array.isArray(assignedSubjects)) {
      res.status(400);
      throw new Error("assignedSubjects must be an array of subject IDs");
    }

    // Check if teacher already exists
    const existingTeacher = await Teacher.findOne({
      phoneNumber: phoneNumberValue,
      isActive: true,
    });

    if (existingTeacher) {
      res.status(400);
      throw new Error("Teacher with this phone number already exists");
    }

    // Verify that assigned subjects belong to the principal's institute
    if (assignedSubjects && assignedSubjects.length > 0) {
      const validSubjects = await Subject.find({
        _id: { $in: assignedSubjects },
        instituteId: principal._id,
        isActive: true,
      });

      if (validSubjects.length !== assignedSubjects.length) {
        res.status(400);
        throw new Error(
          "One or more assigned subjects are invalid or don't belong to your institute"
        );
      }
    }

    // Generate credentials - CORE FUNCTIONALITY
    const applicationId = generateApplicationId(principal.instituteName);
    const password = generateRandomPassword();

    console.log("Generated credentials:", { applicationId, password });

    // Create teacher
    const teacher = await Teacher.create({
      name: name.trim(),
      password,
      applicationId,
      phoneNumber: phoneNumberValue,
      instituteId: principal._id,
      assignedSubjects: assignedSubjects || [],
      permissions: permissions || [],
      role: UserRole.TEACHER,
      isActive: true,
      isCredentialsSent: false,
    });

    if (!teacher) {
      res.status(500);
      throw new Error("Failed to create teacher");
    }

    console.log("Teacher created with ID:", teacher._id);

    // Populate assignedSubjects before returning response
    const populatedTeacher = await Teacher.findById(teacher._id)
      .populate({
        path: "assignedSubjects",
        select: "name description courseId",
        populate: {
          path: "courseId",
          select: "name",
        },
      })
      .select("-password");

    // Handle case where teacher population fails
    if (!populatedTeacher) {
      res.status(500);
      throw new Error("Failed to retrieve created teacher");
    }

    console.log("Teacher populated successfully");

    // Send credentials via SMS
    let smsStatus = false;
    let credentialsSentAt = null;

    try {
      const message = `Welcome to ${principal.instituteName}!\nYour Login Credentials:\nApplication ID: ${applicationId}\nPassword: ${password}\nPlease keep these credentials secure.`;

      await sendSMS(phoneNumberValue.toString(), message);

      // Update teacher record to mark credentials as sent
      await Teacher.findByIdAndUpdate(teacher._id, {
        isCredentialsSent: true,
        credentialsSentAt: new Date(),
      });

      smsStatus = true;
      credentialsSentAt = new Date();
      console.log("SMS sent successfully");
    } catch (smsError) {
      console.error("SMS sending failed:", smsError);
      smsStatus = false;
    }

    // Prepare response data with proper type assertion
    const responseData = {
      _id: (populatedTeacher._id as string).toString(),
      applicationId: populatedTeacher.applicationId as string,
      name: populatedTeacher.name as string,
      phoneNumber: populatedTeacher.phoneNumber as number,
      assignedSubjects: populatedTeacher.assignedSubjects, // Now populated with subject details
      permissions: populatedTeacher.permissions as string[],
      isCredentialsSent: smsStatus,
      credentialsSentAt,
      ...(smsStatus
        ? {}
        : {
            credentials: {
              applicationId,
              password,
            },
          }),
    };

    console.log("Response data prepared:", {
      success: true,
      dataKeys: Object.keys(responseData),
    });

    // Return appropriate response based on SMS status
    if (smsStatus) {
      res.status(201).json({
        success: true,
        message: "Teacher created successfully and credentials sent via SMS",
        data: responseData,
      });
    } else {
      res.status(201).json({
        success: true,
        message: "Teacher created successfully but SMS failed to send",
        data: responseData,
      });
    }
  }
);
// @desc    Login Teacher
// @route   POST /api/v2/auth/teacher/login
// @access  Public
export const loginTeacher = asyncHandler(
  async (req: Request, res: Response) => {
    const { applicationId, password }: LoginTeacherBody = req.body;

    console.log("=== TEACHER LOGIN DEBUG ===");
    console.log("Login attempt with:", { applicationId, password: "***" });

    if (!applicationId || !password) {
      res.status(400);
      throw new Error("Application ID and password are required");
    }

    // Teacher login - without populate to avoid model reference issue
    const user = (await Teacher.findOne({
      applicationId,
      isActive: true,
    })) as ITeacherDocument;

    console.log("Found user:", {
      exists: !!user,
      applicationId: user?.applicationId,
      isActive: user?.isActive,
    });

    if (!user) {
      console.log("ERROR: No teacher found with applicationId:", applicationId);
      res.status(401);
      throw new Error("Invalid credentials - teacher not found");
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    console.log("Password valid:", isPasswordValid);

    if (!isPasswordValid) {
      console.log("ERROR: Invalid password for teacher:", applicationId);
      res.status(401);
      throw new Error("Invalid credentials - incorrect password");
    }

    // Generate JWT token
    const token = generateToken(
      user.id.toString(),
      UserRole.TEACHER,
      user.instituteId.toString()
    );

    console.log("Token generated successfully");

    const response: AuthResponse = {
      _id: user.id.toString(),
      name: user.name,
      email: user.email || "", // Handle optional email
      role: UserRole.TEACHER,
      token,
      instituteId: user.instituteId.toString(),
      applicationId: user.applicationId,
    };

    console.log("Login successful for teacher:", applicationId);

    res.json({
      success: true,
      message: "Login successful",
      data: response,
    });
  }
);

// @desc    Get All Teachers (by Principal)
// @route   GET /api/auth/teachers
// @access  Private (Principal only)
export const getTeachers = asyncHandler(async (req: Request, res: Response) => {
  const principal = req.user as IPrincipalDocument;

  const teachers = await Teacher.find({
    instituteId: principal._id,
    isActive: true,
  })
    .populate("assignedSubjects", "name courseId")
    .select("-password");

  res.json({
    success: true,
    message: "Teachers retrieved successfully",
    data: teachers,
  });
});

// @desc    Update Teacher
// @route   PUT /api/auth/teacher/:id
// @access  Private (Principal only)
export const updateTeacher = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const principal = req.user as IPrincipalDocument;
    const updateData = req.body;

    // Find teacher and verify ownership
    const teacher = await Teacher.findOne({
      _id: id,
      instituteId: principal._id,
    });

    if (!teacher) {
      res.status(404);
      throw new Error("Teacher not found");
    }

    // Update teacher
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate("assignedSubjects", "name courseId")
      .select("-password");

    res.json({
      success: true,
      message: "Teacher updated successfully",
      data: updatedTeacher,
    });
  }
);

// @desc    Delete/Deactivate Teacher
// @route   DELETE /api/auth/teacher/:id
// @access  Private (Principal only)
export const deleteTeacher = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const principal = req.user as IPrincipalDocument;

    // Find teacher and verify ownership
    const teacher = await Teacher.findOne({
      _id: id,
      instituteId: principal._id,
    });

    if (!teacher) {
      res.status(404);
      throw new Error("Teacher not found");
    }

    // Soft delete (deactivate)
    await Teacher.findByIdAndUpdate(id, {
      isActive: false,
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      message: "Teacher deactivated successfully",
    });
  }
);

// @desc    Resend Teacher Credentials
// @access  Private (Principal only)
export const resendCreds = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const principal = req.user as IPrincipalDocument;

  // Find teacher and verify ownership
  const teacher = await Teacher.findOne({
    _id: id,
    instituteId: principal._id,
    isActive: true,
  });

  if (!teacher) {
    res.status(404);
    throw new Error("Teacher not found");
  }

  try {
    const message = `Your ${principal.instituteName} Login Credentials:\nApplication ID: ${teacher.applicationId}\nPassword: [Contact admin for password reset]\nKeep these credentials secure.`;

    await sendSMS(teacher.phoneNumber.toString(), message);

    res.json({
      success: true,
      message: "Credentials sent successfully via SMS",
    });
  } catch (error) {
    res.status(500);
    throw new Error("Failed to send SMS");
  }
});

// @desc    Reset Teacher Password
// @route   POST /api/auth/teacher/:id/reset-password
// @access  Private (Principal only)
export const resetTeacherPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const principal = req.user as IPrincipalDocument;

    // Find teacher and verify ownership
    const teacher = await Teacher.findOne({
      _id: id,
      instituteId: principal._id,
      isActive: true,
    });

    if (!teacher) {
      res.status(404);
      throw new Error("Teacher not found");
    }

    // Generate new password
    const newPassword = generateRandomPassword();

    // Update teacher password
    teacher.password = newPassword;
    await teacher.save();

    try {
      const message = `Your ${principal.instituteName} password has been reset.\nApplication ID: ${teacher.applicationId}\nNew Password: ${newPassword}\nPlease change this password after login.`;

      await sendSMS(teacher.phoneNumber.toString(), message);

      res.json({
        success: true,
        message: "Password reset successfully and sent via SMS",
      });
    } catch (error) {
      res.status(201).json({
        success: true,
        message: "Password reset successfully but SMS failed",
        data: {
          newPassword,
        },
      });
    }
  }
);

// @desc    Get Current User Profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as IPrincipalDocument | ITeacherDocument;
  const userRole = req.userRole;

  let populatedUser;

  if (userRole === UserRole.TEACHER) {
    populatedUser = await Teacher.findById(user._id)
      .populate("instituteId", "instituteName")
      .populate("assignedSubjects", "name courseId")
      .select("-password");
  } else {
    populatedUser = user;
  }

  res.json({
    success: true,
    message: "Profile retrieved successfully",
    data: populatedUser,
  });
});

// @desc    Update Current User Profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user as IPrincipalDocument | ITeacherDocument;
    const userRole = req.userRole;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.password;
    delete updateData.role;
    delete updateData.applicationId;
    delete updateData.instituteId;

    let updatedUser;

    if (userRole === UserRole.TEACHER) {
      updatedUser = await Teacher.findByIdAndUpdate(
        user._id,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      )
        .populate("instituteId", "instituteName")
        .populate("assignedSubjects", "name courseId")
        .select("-password");
    } else if (userRole === UserRole.PRINCIPAL) {
      updatedUser = await Principal.findByIdAndUpdate(
        user._id,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select("-password");
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  }
);
