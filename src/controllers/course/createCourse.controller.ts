import { Response } from "express";
import asyncHandler from "express-async-handler";
import { CourseModel } from "../../models/course/courseModel";

import { AuthenticatedRequest } from "../../types/request.types";
import { InstituteAuth } from "../../models/auth/instituteModel";

// Logic for creating a course
export const createCourse = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { name } = req.body; // Course name from the request body
    const instituteId = req.institute?._id; // Institute ID from the authenticated request

    if (!instituteId) {
      res.status(401);
      throw new Error("Not authorized, institute not found");
    }
    try {
      // Check if the institute exists
      const institute = await InstituteAuth.findById(instituteId);
      if (!institute) {
        res.status(404);
        throw new Error("Institute not found");
      }
      // Create the course
      const course = new CourseModel({
        name,
        institute,
        generalMCQs: [],
        mockMCQs: [],
        longNotes: [],
      });
      // Save the course
      await course.save();
      // Add the course to the institute's courses list
      //   institute.courses.push(course._id);
      //   await institute.save();
      res.status(201).json({
        message: "Course created successfully",
        course,
      });
    } catch (error) {
      res.status(500);
      throw new Error("Error creating course");
    }
  }
);
// Logic for creating a course
export const getCourses = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const instituteId = req.institute?._id;
    if (!instituteId) {
      res.status(401);
      throw new Error("Not authorized");
    }
    // Find all courses associated with this institute
    const courses = await CourseModel.find({ institute: instituteId });
    if (courses.length === 0) {
      res.status(404).json({
        message: "No courses found for this institute",
        count: 0,
        courses: [],
      });
      return; //  Ensure the function exits here
    }
    //  Correct response without explicit return type issues
    res.status(200).json({
      message: "Courses retrieved successfully",
      count: courses.length,
      courses: courses,
    });
  }
);

export const updateCourses = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { courseId, name } = req.body;
    const instituteId = req.institute?._id;

    if (!instituteId) {
      res.status(401);
      throw new Error("Not authorized");
    }

    const course = await CourseModel.findOne({
      _id: courseId,
      institute: instituteId,
    });

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    course.name = name;
    await course.save();

    res.status(200).json({
      success: true,
      data: course,
    });
  }
);

export const deleteCourses = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { courseId } = req.body;
    const instituteId = req.institute?._id;

    if (!instituteId) {
      res.status(401);
      throw new Error("Not authorized");
    }

    const course = await CourseModel.findOneAndDelete({
      _id: courseId,
      institute: instituteId,
    });

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }
    // Remove course from institute's course list
    await InstituteAuth.updateOne(
      { _id: instituteId },
      { $pull: { courses: courseId } }
    );

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  }
);
