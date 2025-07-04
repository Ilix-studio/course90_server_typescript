import {
  IInstituteProfile,
  ProfileRequest,
  ProfileResponse,
} from "../../types/profile.types";

import { Response } from "express";
import asyncHandler from "express-async-handler";

import { InstituteProfileModel } from "../../models/profile/profileModel";
import { Principal } from "../../models/auth/principalModel";

// Create a new profile
export const createInstituteProfile = asyncHandler(
  async (req: ProfileRequest, res: Response<ProfileResponse>) => {
    const { instituteName, address, phoneNumber, website, bio, logo } =
      req.body;
    const instituteId = req.institute?._id;

    if (!instituteId) {
      res.status(400);
      throw new Error("Institute ID is required");
    }

    const instituteProfile = await InstituteProfileModel.create({
      instituteName,
      address,
      phoneNumber,
      website,
      bio,
      logo,
      institute: instituteId,
    });

    const profile: IInstituteProfile = {
      instituteName: instituteProfile.instituteName,
      address: instituteProfile.address,
      phoneNumber: instituteProfile.phoneNumber,
      website: instituteProfile.website,
      bio: instituteProfile.bio,
      logo: instituteProfile.logo,
      institute: instituteProfile.institute,
    };

    res.status(201).json({
      message: "Institute Profile created successfully",
      profile,
    });
  }
);

export const getInstituteProfile = asyncHandler(
  async (req: ProfileRequest, res: Response<ProfileResponse>) => {
    const instituteId = req.institute?._id;

    if (!instituteId) {
      res.status(401);
      throw new Error("Not authorized");
    }

    const profile = await InstituteProfileModel.findOne({
      institute: instituteId,
    });

    if (!profile) {
      res.status(404);
      throw new Error("Profile not found");
    }

    const instituteProfile: IInstituteProfile = {
      instituteName: profile.instituteName,
      address: profile.address,
      phoneNumber: profile.phoneNumber,
      website: profile.website,
      bio: profile.bio,
      logo: profile.logo,
      institute: profile.institute,
    };

    res.status(200).json({
      message: "Profile retrieved successfully",
      profile: instituteProfile,
    });
  }
);

export const updateInstituteProfile = asyncHandler(
  async (req: ProfileRequest, res: Response<ProfileResponse>) => {
    const instituteId = req.institute?._id;

    if (!instituteId) {
      res.status(401);
      throw new Error("Not authorized");
    }

    const profile = await InstituteProfileModel.findOneAndUpdate(
      { institute: instituteId },
      { $set: req.body },
      { new: true }
    );

    if (!profile) {
      res.status(404);
      throw new Error("Profile not found");
    }

    const updatedProfile: IInstituteProfile = {
      instituteName: profile.instituteName,
      address: profile.address,
      phoneNumber: profile.phoneNumber,
      website: profile.website,
      bio: profile.bio,
      logo: profile.logo,
      institute: profile.institute,
    };

    res.status(200).json({
      message: "Profile updated successfully",
      profile: updatedProfile,
    });
  }
);

export const deleteInstituteProfile = asyncHandler(
  async (req: ProfileRequest, res: Response) => {
    const instituteId = req.institute?._id;

    if (!instituteId) {
      res.status(401);
      throw new Error("Not authorized");
    }

    const profile = await InstituteProfileModel.findOneAndDelete({
      institute: instituteId,
    });

    if (!profile) {
      res.status(404);
      throw new Error("Profile not found");
    }

    await Principal.findByIdAndUpdate(instituteId, { profile: null });

    res.status(200).json({
      message: "Profile deleted successfully",
      profile: null,
    });
  }
);
