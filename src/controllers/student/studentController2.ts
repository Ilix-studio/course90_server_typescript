// src/controllers/auth/studentController.ts
import { Request, Response } from "express";
import { StudentModel } from "../../models/auth/studentModel";
import { PasskeyModel } from "../../models/passkeys/passkeyModel";
import asyncHandler from "express-async-handler";
import {
  IStudentDocument,
  IStudentPasskey,
  StudentLoginBody,
  SwitchPasskeyBody,
  UpdateStudentBody,
  ValidatePasskeyBody,
} from "../../types/studentAuth.types";
import { PasskeyStatus } from "../../constants/enums";
import { generateStudentToken, generateToken } from "../../utils/jwt.utils";
import mongoose from "mongoose";

/**
 * @desc    Authenticate student using passkey
 * @route   POST /api/v2/students/login
 * @access  Public
 */
export const loginStudent = asyncHandler(
  async (req: Request, res: Response) => {
    const { passkeyId, deviceId } = req.body as StudentLoginBody;

    if (!passkeyId || !deviceId) {
      res.status(400);
      throw new Error("Please provide both passkey ID and device ID");
    }

    // Populate with debug info
    console.log(`Searching for passkey: ${passkeyId}, deviceId: ${deviceId}`);

    // Check if passkey exists and is valid
    const passkey = await PasskeyModel.findOne({
      passkeyId,
    });

    if (!passkey) {
      console.log(`Passkey not found: ${passkeyId}`);
      res.status(401);
      throw new Error("Passkey not found");
    }

    // Check status and expiration separately for better error messages
    const validStatuses = [
      PasskeyStatus.ACTIVE,
      PasskeyStatus.FULLY_ACTIVE,
      PasskeyStatus.GENERATED,
      PasskeyStatus.PLATFORM_FEE_PENDING,
      PasskeyStatus.PLATFORM_FEE_PAID,
      PasskeyStatus.COURSE_ACCESS_PENDING,
      PasskeyStatus.STUDENT_ASSIGNED,
    ];

    if (!passkey.status || !validStatuses.includes(passkey.status)) {
      console.log(`Invalid passkey status: ${passkey.status}`);
      res.status(401);
      throw new Error(`Invalid passkey status: ${passkey.status}`);
    }

    // Check payment status
    if (passkey.status === PasskeyStatus.PLATFORM_FEE_PENDING) {
      // If status is pending payment, update response to inform the user
      console.log("Passkey requires platform fee payment");

      // Allow login but with payment required flag
      const courseInfo = passkey.courseId as any;
      const platformFee = 90; // Standard platform fee

      res.json({
        success: true,
        paymentRequired: true,
        message: "Payment required to activate passkey",
        data: {
          passkeyId,
          courseId: courseInfo._id,
          courseName: courseInfo.name,
          platformFee,
          status: passkey.status,
        },
      });
      return;
    }

    // Find or create student
    let student = await StudentModel.findOne({
      $or: [{ "passkeys.passkeyId": passkeyId }, { deviceId }],
    });

    if (!student) {
      // Create new student account
      student = new StudentModel({
        deviceId,
        passkeys: [],
      });
    } else {
      // Update device ID if different
      if (student.deviceId !== deviceId) {
        student.deviceId = deviceId;
      }
    }

    // Check if student already has this passkey
    const existingPasskey = student.passkeys.find(
      (p) => p.passkeyId === passkeyId
    );

    if (!existingPasskey) {
      // Add new passkey to student
      student.passkeys.push({
        passkeyId,
        institute: (passkey as any).instituteId,
        courseId: (passkey as any).courseId,
        isActive: true,
        activatedAt: new Date(),
        expiresAt: passkey.expiresAt ? new Date(passkey.expiresAt) : undefined,
      });

      // Deactivate other passkeys
      student.passkeys.forEach((p) => {
        if (p.passkeyId !== passkeyId) {
          p.isActive = false;
        }
      });
    } else if (!existingPasskey.isActive) {
      // Activate this passkey and deactivate others
      student.passkeys.forEach((p) => {
        p.isActive = p.passkeyId === passkeyId;
      });
    }

    // Update passkey with student info if not already set
    const hasStudentId = await PasskeyModel.findOne({
      _id: passkey._id,
      studentId: { $exists: true, $ne: null },
    });

    if (!hasStudentId) {
      await PasskeyModel.findByIdAndUpdate(passkey._id, {
        $set: {
          studentId: student._id,
          assignedAt: new Date(),
          status: PasskeyStatus.STUDENT_ASSIGNED,
        },
        $push: {
          statusHistory: {
            status: PasskeyStatus.STUDENT_ASSIGNED,
            changedAt: new Date(),

            reason: "Student login",
          },
        },
      });
    }

    await student.save();

    // FIXED: Create token using the new generateStudentToken function
    const token = generateStudentToken(student._id.toString(), passkeyId);

    // Get active passkey details
    const activePasskey = student.getActivePasskey();

    // Increment access count
    await PasskeyModel.findOneAndUpdate(
      { passkeyId },
      { $inc: { accessCount: 1 } }
    );

    res.json({
      success: true,
      message: "Student authenticated successfully",
      data: {
        _id: student._id,
        name: student.name,
        email: student.email,
        phoneNumber: student.phoneNumber,
        token,
        activePasskey: activePasskey
          ? {
              passkeyId: activePasskey.passkeyId,
              courseId: {
                _id: activePasskey.courseId,
              },
              institute: {
                _id: activePasskey.institute,
                name: "Institute Name", // This will be populated in a real scenario
              },
              expiresAt: activePasskey.expiresAt,
            }
          : undefined,
      },
    });
  }
);

/**
 * @desc    Validate a passkey
 * @route   POST /api/v2/students/validate-passkey
 * @access  Public
 */
export const validatePasskey = asyncHandler(
  async (req: Request, res: Response) => {
    const { passkey, deviceId } = req.body as ValidatePasskeyBody;

    if (!passkey || !deviceId) {
      res.status(400);
      throw new Error("Please provide both passkey and device ID");
    }

    // Check if passkey exists and is valid
    const passkeyDoc = await PasskeyModel.findOne({
      passkeyId: passkey,
      status: {
        $in: [
          PasskeyStatus.ACTIVE,
          PasskeyStatus.FULLY_ACTIVE,
          PasskeyStatus.GENERATED,
        ],
      },
      expiresAt: { $gt: new Date() },
    })
      .populate("courseId", "name description")
      .populate("instituteId", "instituteName");

    if (!passkeyDoc) {
      res.status(404);
      throw new Error("Invalid or expired passkey");
    }

    // Check if passkey is already assigned to another device
    const existingStudent = await StudentModel.findOne({
      "passkeys.passkeyId": passkey,
      deviceId: { $ne: deviceId },
    });

    if (existingStudent) {
      res.status(400);
      throw new Error("This passkey is already assigned to another device");
    }

    res.json({
      success: true,
      message: "Passkey is valid",
      data: {
        passkeyId: passkeyDoc.passkeyId,
        courseId: {
          _id: passkeyDoc.courseId._id,
        },
        institute: {
          _id: passkeyDoc.instituteId._id,
        },
        expiresAt: passkeyDoc.expiresAt,
        status: passkeyDoc.status,
      },
    });
  }
);

/**
 * @desc    Switch active passkey
 * @route   POST /api/v2/students/switch-passkey
 * @access  Private (Student)
 */
export const switchPasskey = asyncHandler(
  async (req: Request, res: Response) => {
    // Safely type-cast request user to student document
    if (!req.user || !req.user._id) {
      res.status(401);
      throw new Error("Not authorized, invalid student");
    }

    // Find student by ID to ensure we have the correct document type
    const student = await StudentModel.findById(req.user._id);

    if (!student) {
      res.status(404);
      throw new Error("Student not found");
    }

    const { newPasskey } = req.body as SwitchPasskeyBody;

    if (!newPasskey) {
      res.status(400);
      throw new Error("Please provide a passkey to switch to");
    }

    // Check if passkey exists and is valid
    const passkey = await PasskeyModel.findOne({
      passkeyId: newPasskey,
      status: { $in: [PasskeyStatus.ACTIVE, PasskeyStatus.FULLY_ACTIVE] },
      expiresAt: { $gt: new Date() },
    }).populate("courseId", "name description");

    if (!passkey) {
      res.status(404);
      throw new Error("Invalid or expired passkey");
    }

    // Check if student already has this passkey
    const existingPasskey = student.passkeys.find(
      (p: IStudentPasskey) => p.passkeyId === newPasskey
    );

    if (!existingPasskey) {
      // Check if passkey is already assigned to another student
      const otherStudent = await StudentModel.findOne({
        "passkeys.passkeyId": newPasskey,
        _id: { $ne: student._id },
      });

      if (otherStudent) {
        res.status(400);
        throw new Error("This passkey is already assigned to another student");
      }

      // Add this passkey to student's passkeys array
      student.passkeys.push({
        passkeyId: newPasskey,
        institute: passkey.instituteId,
        courseId: passkey.courseId,
        isActive: true,
        activatedAt: new Date(),
        expiresAt: passkey.expiresAt ? new Date(passkey.expiresAt) : undefined,
      });

      // Update passkey with student info
      await PasskeyModel.findByIdAndUpdate(passkey._id, {
        $set: {
          studentId: student._id,
          deviceId: student.deviceId,
          assignedAt: new Date(),
        },
        $push:
          passkey.status === PasskeyStatus.GENERATED
            ? {
                statusHistory: {
                  status: PasskeyStatus.STUDENT_ASSIGNED,
                  changedAt: new Date(),

                  reason: "Student switched to this passkey",
                },
              }
            : {},
      });

      if (passkey.status === PasskeyStatus.GENERATED) {
        await PasskeyModel.findByIdAndUpdate(passkey._id, {
          $set: { status: PasskeyStatus.STUDENT_ASSIGNED },
        });
      }
    } else {
      // Activate this passkey
      existingPasskey.isActive = true;
    }

    // Deactivate other passkeys
    student.passkeys.forEach((p: IStudentPasskey) => {
      if (p.passkeyId !== newPasskey) {
        p.isActive = false;
      }
    });

    await student.save();

    // Get updated active passkey
    const activePasskey = student.getActivePasskey();

    // Create token with new passkey info
    const token = generateToken(
      JSON.stringify({
        id: student._id,
        role: "STUDENT",
        passkeyId: newPasskey,
      })
    );

    res.json({
      success: true,
      message: "Passkey switched successfully",
      data: {
        _id: student._id,
        name: student.name,
        email: student.email,
        phoneNumber: student.phoneNumber,
        token,
        activePasskey: activePasskey
          ? {
              passkeyId: activePasskey.passkeyId,
              courseId: {
                _id: activePasskey.courseId,
              },
              institute: {
                _id: activePasskey.institute,
                name: "Institute Name", // This would be populated in a real scenario
              },
              expiresAt: activePasskey.expiresAt,
            }
          : undefined,
      },
    });
  }
);

/**
 * @desc    Get student profile
 * @route   GET /api/v2/students/profile
 * @access  Private (Student)
 */
export const getStudentProfile = asyncHandler(
  async (req: Request, res: Response) => {
    // Safely type-cast request user to student document
    const studentId = req.user?._id;

    if (!studentId) {
      res.status(401);
      throw new Error("Not authorized, invalid student");
    }

    const student = await StudentModel.findById(studentId);

    if (!student) {
      res.status(404);
      throw new Error("Student not found");
    }

    // Get student's passkeys for course information
    const passkeys = await PasskeyModel.find({
      studentId: student._id,
    })
      .populate("courseId", "name description")
      .populate("instituteId", "instituteName")
      .sort({ assignedAt: -1 });

    // Calculate profile statistics
    const totalCourses = passkeys.length;
    const activeCourses = passkeys.filter(
      (p) =>
        p.status === PasskeyStatus.ACTIVE ||
        p.status === PasskeyStatus.FULLY_ACTIVE
    ).length;
    const expiredCourses = passkeys.filter(
      (p) =>
        p.status === PasskeyStatus.EXPIRED ||
        (p.expiresAt && p.expiresAt <= new Date())
    ).length;

    // Safely handle lastAccessedAt which might be null
    let lastActivity: Date | null = null;
    if (passkeys.length > 0) {
      for (const p of passkeys) {
        if (
          p.lastAccessedAt &&
          (!lastActivity || p.lastAccessedAt > lastActivity)
        ) {
          lastActivity = p.lastAccessedAt;
        }
      }
    }

    const profile = {
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        phoneNumber: student.phoneNumber,
        deviceId: student.deviceId,
        joinedAt: student.createdAt,
      },
      statistics: {
        totalCourses,
        activeCourses,
        expiredCourses,
        totalAccessCount: passkeys.reduce(
          (sum, p) => sum + (p.accessCount || 0),
          0
        ),
        lastActivity,
      },
      courses: passkeys.map((p) => {
        // Type assertion to handle courseId and instituteId population
        const courseId = p.courseId as any;
        const instituteId = p.instituteId as any;

        return {
          id: courseId._id,
          name: courseId.name,
          description: courseId.description,
          institute: {
            id: instituteId._id,
            name: instituteId.instituteName,
          },
          passkeyId: p.passkeyId,
          status: p.status,
          expiresAt: p.expiresAt,
          assignedAt: p.assignedAt,
          accessCount: p.accessCount || 0,
          isActive:
            p.status === PasskeyStatus.ACTIVE ||
            p.status === PasskeyStatus.FULLY_ACTIVE,
        };
      }),
    };

    res.json({
      success: true,
      message: "Student profile retrieved successfully",
      data: profile,
    });
  }
);

/**
 * @desc    Update student profile
 * @route   PUT /api/v2/students/profile
 * @access  Private (Student)
 */
export const updateStudentProfile = asyncHandler(
  async (req: Request, res: Response) => {
    // Safely type-cast request user to student document
    const studentId = req.user?._id;

    if (!studentId) {
      res.status(401);
      throw new Error("Not authorized, invalid student");
    }

    const student = await StudentModel.findById(studentId);

    if (!student) {
      res.status(404);
      throw new Error("Student not found");
    }

    const { name, email, phoneNumber } = req.body as UpdateStudentBody;

    // Validate email if provided
    if (email) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        res.status(400);
        throw new Error("Please provide a valid email address");
      }

      // Check if email is already in use by another student
      const existingStudent = await StudentModel.findOne({
        email,
        _id: { $ne: student._id },
      });

      if (existingStudent) {
        res.status(400);
        throw new Error("Email is already in use");
      }
    }

    // Update only the fields that are provided
    if (name) student.name = name;
    if (email) student.email = email;
    if (phoneNumber) student.phoneNumber = phoneNumber;

    await student.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        _id: student._id,
        name: student.name,
        email: student.email,
        phoneNumber: student.phoneNumber,
      },
    });
  }
);

/**
 * @desc    Get student performance metrics
 * @route   GET /api/v2/students/performance
 * @access  Private (Student)
 */
export const getPerformance = asyncHandler(
  async (req: Request, res: Response) => {
    // Validate student authorization
    if (!req.user || !req.user._id) {
      res.status(401);
      throw new Error("Not authorized, invalid student");
    }

    // Find student by ID to ensure we have the correct document type
    const student = await StudentModel.findById(req.user._id);

    if (!student) {
      res.status(404);
      throw new Error("Student not found");
    }

    // Get all active passkeys for this student
    const passkeys = await PasskeyModel.find({
      studentId: student._id,
      status: { $in: [PasskeyStatus.ACTIVE, PasskeyStatus.FULLY_ACTIVE] },
    })
      .populate("courseId", "name description")
      .populate("instituteId", "instituteName");

    if (passkeys.length === 0) {
      res.status(404);
      throw new Error("No active courses found for student");
    }

    // Get active passkey from student model
    const activePasskey = student.getActivePasskey();
    if (!activePasskey) {
      res.status(404);
      throw new Error("No active passkey found");
    }

    // Get active course metrics
    const activeCourseId = activePasskey.courseId;

    // Mock performance metrics (in a real app, this would fetch from a separate collection)
    const mockPerformance = {
      attendance: Math.floor(Math.random() * 31) + 70, // 70-100%
      assignments: {
        completed: Math.floor(Math.random() * 15) + 5,
        total: 20,
        avgScore: Math.floor(Math.random() * 21) + 80, // 80-100
      },
      tests: {
        completed: Math.floor(Math.random() * 5) + 1,
        total: 5,
        avgScore: Math.floor(Math.random() * 31) + 70, // 70-100
      },
      lastActivity: new Date(
        Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)
      ), // Random day in the last week
      improvement: Math.floor(Math.random() * 11) + 5, // 5-15%
    };

    res.json({
      success: true,
      message: "Student performance retrieved successfully",
      data: {
        courseId: activeCourseId,
        metrics: mockPerformance,
        // In a real app, we might include more detailed analytics here
      },
    });
  }
);

/**
 * @desc    Renew an expired passkey
 * @route   POST /api/v2/students/renew-passkey
 * @access  Private (Student)
 */
export const renewPasskey = asyncHandler(
  async (req: Request, res: Response) => {
    // Validate student authorization
    if (!req.user || !req.user._id) {
      res.status(401);
      throw new Error("Not authorized, invalid student");
    }

    const { passkeyId } = req.body;

    if (!passkeyId) {
      res.status(400);
      throw new Error("Please provide the passkey ID to renew");
    }

    // Find student by ID to ensure we have the correct document type
    const student = await StudentModel.findById(req.user._id);

    if (!student) {
      res.status(404);
      throw new Error("Student not found");
    }

    // Check if student has this passkey
    const studentPasskey = student.passkeys.find(
      (p) => p.passkeyId === passkeyId
    );

    if (!studentPasskey) {
      res.status(404);
      throw new Error("Passkey not found in student's account");
    }

    // Find the passkey in the database
    const passkey = await PasskeyModel.findOne({
      passkeyId,
      studentId: student._id,
      status: PasskeyStatus.EXPIRED,
    });

    if (!passkey) {
      res.status(400);
      throw new Error("Passkey is not expired or not available for renewal");
    }

    // Calculate new expiry (1 month from now)
    const newExpiryDate = new Date();
    newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);

    // Update passkey status to ACTIVE
    await PasskeyModel.findByIdAndUpdate(passkey._id, {
      $set: {
        status: PasskeyStatus.ACTIVE,
        expiresAt: newExpiryDate,
        nextPlatformFeeDue: newExpiryDate,
      },
      $push: {
        statusHistory: {
          status: PasskeyStatus.ACTIVE,
          changedAt: new Date(),

          reason: "Passkey renewal",
        },
        platformFeePayments: {
          amount: 90, // Standard platform fee
          paidAt: new Date(),
          paidBy: "STUDENT",
          paymentMethod: "RENEWAL",
          validUntil: newExpiryDate,
        },
      },
    });

    // Update student's passkey
    studentPasskey.isActive = true;
    studentPasskey.expiresAt = newExpiryDate;

    // Deactivate other passkeys
    student.passkeys.forEach((p) => {
      if (p.passkeyId !== passkeyId) {
        p.isActive = false;
      }
    });

    await student.save();

    // Generate new token with renewed passkey
    const token = generateToken(
      JSON.stringify({
        id: student._id,
        role: "STUDENT",
        passkeyId,
      })
    );

    res.json({
      success: true,
      message: "Passkey renewed successfully",
      data: {
        _id: student._id,
        name: student.name,
        email: student.email,
        token,
        renewedPasskey: {
          passkeyId,
          expiresAt: newExpiryDate,
          status: PasskeyStatus.ACTIVE,
        },
      },
    });
  }
);

/**
 * @desc    Switch to a different student account
 * @route   POST /api/v2/students/switch-account
 * @access  Public
 */
export const switchAccount = asyncHandler(
  async (req: Request, res: Response) => {
    const { passkeyId, deviceId } = req.body;

    if (!passkeyId || !deviceId) {
      res.status(400);
      throw new Error("Please provide both passkey ID and device ID");
    }

    // Check if passkey exists and is valid
    const passkey = await PasskeyModel.findOne({
      passkeyId,
      status: { $in: [PasskeyStatus.ACTIVE, PasskeyStatus.FULLY_ACTIVE] },
      expiresAt: { $gt: new Date() },
    }).populate("courseId", "name description");

    if (!passkey) {
      res.status(401);
      throw new Error("Invalid or expired passkey");
    }

    // Get student ID from the passkey document
    const studentIdValue = (passkey as any).studentId;

    if (!studentIdValue) {
      res.status(400);
      throw new Error(
        "This passkey is not assigned to any student account yet"
      );
    }

    // Find the student who owns this passkey
    const existingStudent = await StudentModel.findById(studentIdValue);

    if (!existingStudent) {
      res.status(404);
      throw new Error("Student account not found");
    }

    // Check if device ID matches
    if (existingStudent.deviceId !== deviceId) {
      // Create a new login session for this device
      existingStudent.deviceId = deviceId;

      // Update the passkey's device ID
      await PasskeyModel.findByIdAndUpdate(passkey._id, {
        $set: { deviceId },
      });
    }

    // Activate this passkey in the student account
    existingStudent.passkeys.forEach((p) => {
      p.isActive = p.passkeyId === passkeyId;
    });

    await existingStudent.save();

    // Create token for the student
    const token = generateStudentToken(
      existingStudent._id.toString(),
      passkeyId
    );

    // Get active passkey details
    const activePasskey = existingStudent.getActivePasskey();

    // Increment access count
    await PasskeyModel.findOneAndUpdate(
      { passkeyId },
      { $inc: { accessCount: 1 } }
    );

    res.json({
      success: true,
      message: "Account switched successfully",
      data: {
        _id: existingStudent._id,
        name: existingStudent.name,
        email: existingStudent.email,
        phoneNumber: existingStudent.phoneNumber,
        token,
        activePasskey: activePasskey
          ? {
              passkeyId: activePasskey.passkeyId,
              courseId: {
                _id: activePasskey.courseId,
              },
              institute: {
                _id: activePasskey.institute,
                name: "Institute Name", // This would be populated in a real scenario
              },
              expiresAt: activePasskey.expiresAt
                ? new Date(activePasskey.expiresAt)
                : undefined,
            }
          : undefined,
      },
    });
  }
);
