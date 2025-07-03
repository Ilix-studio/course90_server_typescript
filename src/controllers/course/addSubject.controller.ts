import { UserRole } from "../../constants/enums";
import { Teacher } from "../../models/auth/teacherModel";
import { CourseModel } from "../../models/course/courseModel";
import { Subject } from "../../models/course/subjectModel";
import { CreateSubjectBody } from "../../types/course.types";

import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

// @desc    Add Subject to Course
// @route   POST /api/course/:courseId/subject
// @access  Private (Principal only)
export const addSubject = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const { name, description, assignedTeacher }: CreateSubjectBody = req.body;
  const principal = req.user as any;

  // Verify course ownership
  const course = await CourseModel.findOne({
    _id: courseId,
    instituteId: principal._id,
    isActive: true,
  });

  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  // Check if subject already exists in this course
  const existingSubject = await Subject.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
    courseId: courseId,
  });

  if (existingSubject) {
    res.status(400);
    throw new Error("Subject with this name already exists in this course");
  }

  // If teacher is assigned, verify they belong to this institute
  if (assignedTeacher) {
    const teacher = await Teacher.findOne({
      _id: assignedTeacher,
      instituteId: principal._id,
      isActive: true,
    });

    if (!teacher) {
      res.status(400);
      throw new Error("Teacher not found or doesn't belong to your institute");
    }
  }

  // Create subject
  const subject = await Subject.create({
    name,
    description,
    courseId,
    instituteId: principal._id,
    assignedTeacher: assignedTeacher || undefined,
  });

  // Add subject to course's subjects array
  await CourseModel.findByIdAndUpdate(courseId, {
    $push: { subjects: subject._id },
  });

  // Add subject to teacher's assignedSubjects if teacher is assigned
  if (assignedTeacher) {
    await Teacher.findByIdAndUpdate(assignedTeacher, {
      $push: { assignedSubjects: subject._id },
    });
  }

  const populatedSubject = await Subject.findById(subject._id).populate(
    "assignedTeacher",
    "name email applicationId"
  );

  res.status(201).json({
    success: true,
    message: "Subject added successfully",
    data: populatedSubject,
  });
});

// @desc    Update Subject
// @route   PUT /api/course/subject/:id
// @access  Private (Principal only)
export const updateSubject = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const principal = req.user as any;
    const updateData = req.body;

    // Find subject and verify ownership
    const subject = await Subject.findOne({
      _id: id,
      instituteId: principal._id,
      isActive: true,
    });

    if (!subject) {
      res.status(404);
      throw new Error("Subject not found");
    }

    // If updating assigned teacher, verify teacher belongs to institute
    if (updateData.assignedTeacher) {
      const teacher = await Teacher.findOne({
        _id: updateData.assignedTeacher,
        instituteId: principal._id,
        isActive: true,
      });

      if (!teacher) {
        res.status(400);
        throw new Error(
          "Teacher not found or doesn't belong to your institute"
        );
      }

      // Remove subject from old teacher's assignedSubjects
      if (subject.assignedTeacher) {
        await Teacher.findByIdAndUpdate(subject.assignedTeacher, {
          $pull: { assignedSubjects: id },
        });
      }

      // Add subject to new teacher's assignedSubjects
      await Teacher.findByIdAndUpdate(updateData.assignedTeacher, {
        $push: { assignedSubjects: id },
      });
    }

    // Update subject
    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate("assignedTeacher", "name email applicationId");

    res.json({
      success: true,
      message: "Subject updated successfully",
      data: updatedSubject,
    });
  }
);

// @desc    Delete Subject
// @route   DELETE /api/course/subject/:id
// @access  Private (Principal only)
export const deleteSubject = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const principal = req.user as any;

    // Find subject and verify ownership
    const subject = await Subject.findOne({
      _id: id,
      instituteId: principal._id,
    });

    if (!subject) {
      res.status(404);
      throw new Error("Subject not found");
    }

    // Soft delete subject
    await Subject.findByIdAndUpdate(id, {
      isActive: false,
      updatedAt: new Date(),
    });

    // Remove subject from course's subjects array
    await CourseModel.findByIdAndUpdate(subject.courseId, {
      $pull: { subjects: id },
    });

    // Remove subject from teacher's assignedSubjects
    if (subject.assignedTeacher) {
      await Teacher.findByIdAndUpdate(subject.assignedTeacher, {
        $pull: { assignedSubjects: id },
      });
    }

    res.json({
      success: true,
      message: "Subject deleted successfully",
    });
  }
);

// @desc    Get Subjects by Course
// @route   GET /api/course/:courseId/subjects
// @access  Private (Principal, Teacher)
export const getSubjectsByCourse = asyncHandler(
  async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const user = req.user as any;
    const userRole = req.userRole;

    let subjects;

    if (userRole === UserRole.PRINCIPAL) {
      // Verify course ownership
      const course = await CourseModel.findOne({
        _id: courseId,
        instituteId: user._id,
        isActive: true,
      });

      if (!course) {
        res.status(404);
        throw new Error("Course not found");
      }

      subjects = await Subject.find({
        courseId,
        isActive: true,
      })
        .populate("assignedTeacher", "name email applicationId")
        .sort({ createdAt: -1 });
    } else if (userRole === UserRole.TEACHER) {
      // Teacher can only see their assigned subjects
      const teacher = await Teacher.findById(user._id);
      const assignedSubjectIds = teacher?.assignedSubjects || [];

      subjects = await Subject.find({
        _id: { $in: assignedSubjectIds },
        courseId,
        isActive: true,
      })
        .populate("assignedTeacher", "name email applicationId")
        .sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      message: "Subjects retrieved successfully",
      data: subjects,
    });
  }
);
