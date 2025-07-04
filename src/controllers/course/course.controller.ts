import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { Subject } from "../../models/course/subjectModel";
import { Principal } from "../../models/auth/principalModel";
import { Teacher } from "../../models/auth/teacherModel";

import { CourseModel } from "../../models/course/courseModel";
import { UserRole } from "../../constants/enums";
import { CreateCourseBody } from "../../types/course.types";

// @desc    Create Course (by Principal)
// @route   POST /api/course/create
// @access  Private (Principal only)
export const createCourse = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, description }: CreateCourseBody = req.body;
    const principal = req.user as any;

    // Check if course already exists for this institute
    const existingCourse = await CourseModel.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      instituteId: principal._id,
    });

    if (existingCourse) {
      res.status(400);
      throw new Error("Course with this name already exists in your institute");
    }

    // Create course
    const course = await CourseModel.create({
      name,
      description,
      instituteId: principal._id,
    });

    // Add course to principal's courses array
    await Principal.findByIdAndUpdate(principal._id, {
      $push: { courses: course._id },
    });

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: course,
    });
  }
);

// @desc    Get Courses
// @route   GET /api/course/
// @access  Private (Principal, Teacher)
export const getCourses = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as any;
  const userRole = req.userRole;

  let courses;

  if (userRole === UserRole.PRINCIPAL) {
    // Principal can see all their institute's courses
    courses = await CourseModel.find({
      instituteId: user._id,
      isActive: true,
    })
      .populate({
        path: "subjects",
        populate: {
          path: "assignedTeacher",
          select: "name email applicationId",
        },
      })
      .sort({ createdAt: -1 });
  } else if (userRole === UserRole.TEACHER) {
    // Teacher can see courses where they have assigned subjects
    const teacher = await Teacher.findById(user._id).populate(
      "assignedSubjects"
    );

    const subjectIds = teacher?.assignedSubjects || [];
    const subjects = await Subject.find({
      _id: { $in: subjectIds },
      isActive: true,
    });

    const courseIds = [...new Set(subjects.map((subject) => subject.courseId))];

    courses = await CourseModel.find({
      _id: { $in: courseIds },
      isActive: true,
    })
      .populate({
        path: "subjects",
        match: { _id: { $in: subjectIds } },
        populate: {
          path: "assignedTeacher",
          select: "name email applicationId",
        },
      })
      .sort({ createdAt: -1 });
  }

  res.json({
    success: true,
    message: "Courses retrieved successfully",
    data: courses,
  });
});

// @desc    Get Single Course
// @route   GET /api/course/:id
// @access  Private (Principal, Teacher)
export const getCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user as any;
  const userRole = req.userRole;

  let course;

  if (userRole === UserRole.PRINCIPAL) {
    course = await CourseModel.findOne({
      _id: id,
      instituteId: user._id,
      isActive: true,
    }).populate({
      path: "subjects",
      populate: {
        path: "assignedTeacher",
        select: "name email applicationId phoneNumber",
      },
    });
  } else if (userRole === UserRole.TEACHER) {
    // Check if teacher has access to this course through assigned subjects
    const teacher = await Teacher.findById(user._id).populate(
      "assignedSubjects"
    );

    const assignedSubjectIds =
      teacher?.assignedSubjects.map((s) => s._id) || [];

    course = await CourseModel.findOne({
      _id: id,
      isActive: true,
    }).populate({
      path: "subjects",
      match: { _id: { $in: assignedSubjectIds } },
      populate: {
        path: "assignedTeacher",
        select: "name email applicationId",
      },
    });

    // Check if teacher has access through populated subjects
    const populatedSubjects = course?.subjects || [];
    const hasAccess =
      Array.isArray(populatedSubjects) && populatedSubjects.length > 0;

    if (!course || !hasAccess) {
      res.status(403);
      throw new Error("Access denied. You don't have access to this course.");
    }
  }

  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  res.json({
    success: true,
    message: "Course retrieved successfully",
    data: course,
  });
});

// @desc    Update Course
// @route   PUT /api/course/:id
// @access  Private (Principal only)
export const updateCourse = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const principal = req.user as any;
    const updateData = req.body;

    // Find course and verify ownership
    const course = await CourseModel.findOne({
      _id: id,
      instituteId: principal._id,
      isActive: true,
    });

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    // Check if new name conflicts with existing courses
    if (updateData.name && updateData.name !== course.name) {
      const existingCourse = await CourseModel.findOne({
        name: { $regex: new RegExp(`^${updateData.name}$`, "i") },
        instituteId: principal._id,
        _id: { $ne: id },
      });

      if (existingCourse) {
        res.status(400);
        throw new Error("Course with this name already exists");
      }
    }

    // Update course
    const updatedCourse = await CourseModel.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate({
      path: "subjects",
      populate: {
        path: "assignedTeacher",
        select: "name email applicationId",
      },
    });

    res.json({
      success: true,
      message: "Course updated successfully",
      data: updatedCourse,
    });
  }
);

// @desc    Delete Course
// @route   DELETE /api/course/:id
// @access  Private (Principal only)
export const deleteCourse = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const principal = req.user as any;

    // Find course and verify ownership
    const course = await CourseModel.findOne({
      _id: id,
      instituteId: principal._id,
    });

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    // Soft delete course and its subjects
    await CourseModel.findByIdAndUpdate(id, {
      isActive: false,
      updatedAt: new Date(),
    });

    await Subject.updateMany(
      { courseId: id },
      {
        isActive: false,
        updatedAt: new Date(),
      }
    );

    // Remove course from principal's courses array
    await Principal.findByIdAndUpdate(principal._id, {
      $pull: { courses: id },
    });

    res.json({
      success: true,
      message: "Course deleted successfully",
    });
  }
);
