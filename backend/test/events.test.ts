import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/utils/db.js";
import bcrypt from "bcrypt";

// describe("GET /api/events", () => {
//     it("rejects an API key with a valid prefix but invalid secret", async () => {
//         const app = buildApp();

//         const project = await prisma.project.create({
//             data: {
//                 name: "Invalid Secret Project"
//             }
//         });

//         const validApiKey = "etrk_test_security_123456789";
//         const keyPrefix = validApiKey.slice(0, 14);
//         const keyHash = await bcrypt.hash(validApiKey, 12);

//         await prisma.apiKey.create({
//             data: {
//                 keyPrefix,
//                 keyHash,
//                 projectId: project.id
//             }
//         });

//         const invalidApiKey = `${keyPrefix}wrong-secret`;

//         const response = await app.inject({
//             method: "GET",
//             url: "/api/events",
//             headers: {
//                 "x-api-key": invalidApiKey
//             }
//         });

//         expect(response.statusCode).toBe(401);

//         await prisma.apiKey.deleteMany({
//             where: {
//                 projectId: project.id
//             }
//         });

//         await prisma.project.delete({
//             where: {
//                 id: project.id
//             }
//         });

//         await app.close();
//     });
//     it("groups identical errors into the same error group", async () => {
//         const app = buildApp();

//         const project = await prisma.project.create({
//             data: {
//                 name: "Grouping Test Project"
//             }
//         });

//         const apiKey = `etrk_test_group_${project.id}`;
//         const hash = await bcrypt.hash(apiKey, 12);

//         await prisma.apiKey.create({
//             data: {
//                 keyPrefix: apiKey.split("_").slice(0, 3).join("_"),
//                 keyHash: hash,
//                 projectId: project.id
//             }
//         });

//         const error = {
//             message: "Database connection failed",
//             name: "Error",
//             stack: "Error: Database connection failed",
//             timestamp: new Date().toISOString()
//         };

//         const first = await app.inject({
//             method: "POST",
//             url: "/api/events",
//             headers: {
//                 "x-api-key": apiKey
//             },
//             payload: error
//         });

//         const second = await app.inject({
//             method: "POST",
//             url: "/api/events",
//             headers: {
//                 "x-api-key": apiKey
//             },
//             payload: error
//         });

//         expect(first.statusCode).toBe(202);
//         expect(second.statusCode).toBe(202);

//         const events = await prisma.errorEvent.findMany({
//             where: {
//                 projectId: project.id
//             }
//         });

//         expect(events).toHaveLength(2);
//         expect(events[0].groupId).toBe(events[1].groupId);

//         const groups = await prisma.errorGroup.findMany({
//             where: {
//                 projectId: project.id
//             }
//         });

//         expect(groups).toHaveLength(1);

//         await prisma.apiKey.deleteMany({
//             where: {
//                 projectId: project.id
//             }
//         });

//         await prisma.project.delete({
//             where: {
//                 id: project.id
//             }
//         });

//         await app.close();
//     });
// });

describe("POST /api/events", () => {
    // it("groups identical errors into the same error group", async () => {
    //     const app = buildApp();

    //     const project = await prisma.project.create({
    //         data: {
    //             name: "Grouping Test Project"
    //         }
    //     });

    //     const keyPrefix = `etrk_test_${project.id}`;
    //     const apiKey = `${keyPrefix}_secret`;

    //     const hash = await bcrypt.hash(apiKey, 12);

    //     await prisma.apiKey.create({
    //         data: {
    //             keyPrefix,
    //             keyHash: hash,
    //             projectId: project.id
    //         }
    //     });

    //     const error = {
    //         message: "Database connection failed",
    //         name: "Error",
    //         stack: "Error: Database connection failed",
    //         timestamp: new Date().toISOString()
    //     };

    //     const firstResponse = await app.inject({
    //         method: "POST",
    //         url: "/api/events",
    //         headers: {
    //             "x-api-key": apiKey
    //         },
    //         payload: error
    //     });

    //     const secondResponse = await app.inject({
    //         method: "POST",
    //         url: "/api/events",
    //         headers: {
    //             "x-api-key": apiKey
    //         },
    //         payload: error
    //     });

    //     const thirdResponse = await app.inject({
    //         method: "POST",
    //         url: "/api/events",
    //         headers: {
    //             "x-api-key": apiKey
    //         },
    //         payload: error
    //     });

    //     expect(firstResponse.statusCode).toBe(202);
    //     expect(secondResponse.statusCode).toBe(202);
    //     expect(thirdResponse.statusCode).toBe(202);

    //     const events = await prisma.errorEvent.findMany({
    //         where: {
    //             projectId: project.id
    //         }
    //     });

    //     expect(events).toHaveLength(3);

    //     expect(events[0].groupId).toBe(events[1].groupId);
    //     expect(events[1].groupId).toBe(events[2].groupId);

    //     const groups = await prisma.errorGroup.findMany({
    //         where: {
    //             projectId: project.id
    //         }
    //     });

    //     expect(groups).toHaveLength(1);
    //     expect(groups[0].occurrenceCount).toBe(3);

    //     await prisma.apiKey.deleteMany({
    //         where: {
    //             projectId: project.id
    //         }
    //     });

    //     await prisma.project.delete({
    //         where: {
    //             id: project.id
    //         }
    //     });

    //     await app.close();
    // });

    //     it("creates different error groups for different errors", async () => {
    //     const app = buildApp();

    //     const project = await prisma.project.create({
    //         data: {
    //             name: "Different Errors Test Project"
    //         }
    //     });

    //     const keyPrefix = `etrk_test_${project.id}`;
    //     const apiKey = `${keyPrefix}_secret`;

    //     const hash = await bcrypt.hash(apiKey, 12);

    //     await prisma.apiKey.create({
    //         data: {
    //             keyPrefix,
    //             keyHash: hash,
    //             projectId: project.id
    //         }
    //     });

    //     const errorA = {
    //         message: "Database connection failed",
    //         name: "Error",
    //         stack: "Error: Database connection failed",
    //         timestamp: new Date().toISOString()
    //     };

    //     const errorB = {
    //         message: "Payment processing failed",
    //         name: "Error",
    //         stack: "Error: Payment processing failed",
    //         timestamp: new Date().toISOString()
    //     };

    //     const firstResponse = await app.inject({
    //         method: "POST",
    //         url: "/api/events",
    //         headers: {
    //             "x-api-key": apiKey
    //         },
    //         payload: errorA
    //     });

    //     const secondResponse = await app.inject({
    //         method: "POST",
    //         url: "/api/events",
    //         headers: {
    //             "x-api-key": apiKey
    //         },
    //         payload: errorB
    //     });

    //     expect(firstResponse.statusCode).toBe(202);
    //     expect(secondResponse.statusCode).toBe(202);

    //     const events = await prisma.errorEvent.findMany({
    //         where: {
    //             projectId: project.id
    //         },
    //         orderBy: {
    //             createdAt: "asc"
    //         }
    //     });

    //     expect(events).toHaveLength(2);

    //     expect(events[0].groupId).not.toBe(events[1].groupId);

    //     const groups = await prisma.errorGroup.findMany({
    //         where: {
    //             projectId: project.id
    //         }
    //     });

    //     expect(groups).toHaveLength(2);

    //     expect(groups[0].occurrenceCount).toBe(1);
    //     expect(groups[1].occurrenceCount).toBe(1);

    //     await prisma.apiKey.deleteMany({
    //         where: {
    //             projectId: project.id
    //         }
    //     });

    //     await prisma.project.delete({
    //         where: {
    //             id: project.id
    //         }
    //     });

    //     await app.close();
    // });

    it("handles concurrent identical errors safely", async () => {
        const app = buildApp();

        const project = await prisma.project.create({
            data: {
                name: "Concurrent Grouping Test"
            }
        });

        const keyPrefix = `etrk_test_${project.id}`;
        const apiKey = `${keyPrefix}_secret`;

        const hash = await bcrypt.hash(apiKey, 12);

        await prisma.apiKey.create({
            data: {
                keyPrefix,
                keyHash: hash,
                projectId: project.id
            }
        });

        const error = {
            message: "Database connection failed",
            name: "Error",
            stack: "Error: Database connection failed",
            timestamp: new Date().toISOString()
        };

        const responses = await Promise.all([
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            }),
            app.inject({
                method: "POST",
                url: "/api/events",
                headers: {
                    "x-api-key": apiKey
                },
                payload: error
            })
        ]);

        for (const response of responses) {
            expect(response.statusCode).toBe(202);
        }

        const events = await prisma.errorEvent.findMany({
            where: {
                projectId: project.id
            }
        });

        const groups = await prisma.errorGroup.findMany({
            where: {
                projectId: project.id
            }
        });

        expect(events).toHaveLength(20);
        expect(groups).toHaveLength(1);
        expect(groups[0].occurrenceCount).toBe(20);

        for (const event of events) {
            expect(event.groupId).toBe(groups[0].id);
        }

        await prisma.apiKey.deleteMany({
            where: {
                projectId: project.id
            }
        });

        await prisma.project.delete({
            where: {
                id: project.id
            }
        });

        await app.close();
    });
});