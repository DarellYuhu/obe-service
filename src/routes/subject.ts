import express from "express";
import prisma from "../database";
import { Subject_Cpl } from "../../global";
import { validateSchema } from "../middleware";
import { mappingCplSchema } from "../schemas";

const RouterSubject = express.Router();

RouterSubject.put(
  "/:id/cpl-mapping",
  validateSchema(mappingCplSchema),
  async (req, res) => {
    try {
      const { cplIds } = req.body;
      const { id } = req.params;

      const payload: Subject_Cpl[] = cplIds.map((cplId: string) => {
        return {
          cplId,
          subjectId: id,
        };
      });

      const data = await prisma.$transaction(async (prisma) => {
        const deletedCpl = await prisma.subject_Cpl.findMany({
          where: {
            cplId: {
              notIn: cplIds,
            },
          },
        });

        await prisma.subject_Cpl.createMany({
          data: payload,
          skipDuplicates: true,
        });

        if (deletedCpl.length > 0) {
          await prisma.subject_Cpl.deleteMany({
            where: {
              cplId: {
                in: deletedCpl.map((cpl) => cpl.cplId),
              },
              subjectId: id,
            },
          });
        }

        return await prisma.subject.findUnique({
          where: {
            id,
          },
          include: {
            Subject_Cpl: {
              select: {
                cpl: true,
              },
            },
          },
        });
      });

      res.status(201).json({
        status: true,
        message: "CPLs mapped to subject",
        data,
      });
    } catch (error) {
      if (error.code === "P2003") {
        return res.status(404).json({
          status: false,
          message: "Subject or CPL not found",
          error,
        });
      }

      if (error.code === "P2002") {
        return res.status(409).json({
          status: false,
          message: "CPL already mapped to subject",
          error,
        });
      }

      res.status(500).json({
        status: false,
        message: "Internal server error",
        error,
      });
    }
  }
);

RouterSubject.get("/:id/cpl-mapping", async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.subject.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        code: true,
        englishName: true,
        indonesiaName: true,
        Subject_Cpl: {
          select: {
            cpl: {
              select: {
                code: true,
                id: true,
              },
            },
          },
        },
        Curriculum_Subject: {
          select: {
            curriculum: {
              select: {
                Cpl: {
                  select: {
                    id: true,
                    code: true,
                    description: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!data) {
      return res.status(404).json({
        status: false,
        message: "Data not found",
      });
    }

    res.json({
      status: true,
      message: "Data retrieved",
      data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error,
    });
  }
});

export default RouterSubject;
