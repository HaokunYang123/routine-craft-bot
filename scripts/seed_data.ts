/**
 * Seed Data Script for TeachCoachConnect
 *
 * This script populates the database with test data for development.
 * Run with: npx ts-node scripts/seed_data.ts
 *
 * Prerequisites:
 * - Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 * - Or update the values below directly
 */

import { createClient } from "@supabase/supabase-js";

// Configuration - update these or use environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || "https://vjzaayxeoeojuccbriid.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_SERVICE_KEY) {
  console.error("Error: SUPABASE_SERVICE_ROLE_KEY is required");
  console.log("Set it via environment variable or update this script directly");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test Data Configuration
const TEST_DATA = {
  coach: {
    email: "test_coach@example.com",
    password: "TestCoach123!",
    display_name: "Coach Smith",
  },
  groups: [
    { name: "Varsity Basketball", description: "Main varsity team" },
    { name: "Morning Rehab", description: "Injury recovery group" },
  ],
  students: [
    { email: "student_a@example.com", password: "Student123!", display_name: "Alex Johnson", group: "Varsity Basketball" },
    { email: "student_b@example.com", password: "Student123!", display_name: "Jordan Lee", group: "Morning Rehab" },
    { email: "student_c@example.com", password: "Student123!", display_name: "Sam Rivera", group: "Varsity Basketball" },
  ],
  templates: [
    {
      name: "Warmup Routine A",
      tasks: [
        { title: "Dynamic Stretches", description: "Arm circles, leg swings, torso twists", duration_minutes: 10, day_offset: 0 },
        { title: "Light Cardio", description: "5 minutes of jogging in place", duration_minutes: 5, day_offset: 0 },
        { title: "Core Activation", description: "Planks and bird dogs", duration_minutes: 5, day_offset: 0 },
      ],
    },
    {
      name: "Strength Block B",
      tasks: [
        { title: "Squats", description: "3 sets of 10 bodyweight squats", duration_minutes: 15, day_offset: 0 },
        { title: "Push-ups", description: "3 sets of 8-10 push-ups", duration_minutes: 10, day_offset: 0 },
        { title: "Lunges", description: "3 sets of 8 each leg", duration_minutes: 10, day_offset: 1 },
        { title: "Plank Hold", description: "3 sets of 30 seconds", duration_minutes: 5, day_offset: 1 },
      ],
    },
  ],
};

// Helper to generate a random join code
function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function seedDatabase() {
  console.log("Starting database seed...\n");

  try {
    // 1. Create Coach User
    console.log("1. Creating coach user...");
    const { data: coachAuth, error: coachAuthError } = await supabase.auth.admin.createUser({
      email: TEST_DATA.coach.email,
      password: TEST_DATA.coach.password,
      email_confirm: true,
      user_metadata: { role: "coach" },
    });

    if (coachAuthError) {
      if (coachAuthError.message.includes("already been registered")) {
        console.log("   Coach already exists, fetching existing user...");
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingCoach = users?.users.find(u => u.email === TEST_DATA.coach.email);
        if (existingCoach) {
          (coachAuth as any) = { user: existingCoach };
        }
      } else {
        throw coachAuthError;
      }
    }

    const coachId = coachAuth?.user?.id;
    if (!coachId) throw new Error("Failed to get coach ID");

    // Update coach profile
    await supabase.from("profiles").upsert({
      user_id: coachId,
      display_name: TEST_DATA.coach.display_name,
      role: "coach",
    });
    console.log(`   Coach created: ${TEST_DATA.coach.email} (ID: ${coachId})`);

    // 2. Create Groups/Classes
    console.log("\n2. Creating groups...");
    const groupIds: Record<string, string> = {};

    for (const group of TEST_DATA.groups) {
      const joinCode = generateJoinCode();
      const { data: groupData, error: groupError } = await supabase
        .from("class_sessions")
        .upsert(
          {
            coach_id: coachId,
            name: group.name,
            join_code: joinCode,
            is_active: true,
          },
          { onConflict: "name,coach_id" }
        )
        .select()
        .single();

      if (groupError) {
        // Try to fetch existing
        const { data: existing } = await supabase
          .from("class_sessions")
          .select("*")
          .eq("coach_id", coachId)
          .eq("name", group.name)
          .single();
        if (existing) {
          groupIds[group.name] = existing.id;
          console.log(`   Group exists: ${group.name} (Code: ${existing.join_code})`);
        } else {
          console.error(`   Error creating group ${group.name}:`, groupError.message);
        }
      } else if (groupData) {
        groupIds[group.name] = groupData.id;
        console.log(`   Created: ${group.name} (Code: ${joinCode})`);
      }
    }

    // 3. Create Student Users
    console.log("\n3. Creating students...");
    const studentIds: Record<string, string> = {};

    for (const student of TEST_DATA.students) {
      const { data: studentAuth, error: studentAuthError } = await supabase.auth.admin.createUser({
        email: student.email,
        password: student.password,
        email_confirm: true,
        user_metadata: { role: "student" },
      });

      let studentId: string | undefined;

      if (studentAuthError) {
        if (studentAuthError.message.includes("already been registered")) {
          const { data: users } = await supabase.auth.admin.listUsers();
          const existingStudent = users?.users.find(u => u.email === student.email);
          studentId = existingStudent?.id;
          console.log(`   Student exists: ${student.display_name}`);
        } else {
          console.error(`   Error creating ${student.email}:`, studentAuthError.message);
          continue;
        }
      } else {
        studentId = studentAuth?.user?.id;
        console.log(`   Created: ${student.display_name} (${student.email})`);
      }

      if (studentId) {
        studentIds[student.email] = studentId;

        // Update profile
        await supabase.from("profiles").upsert({
          user_id: studentId,
          display_name: student.display_name,
          role: "student",
        });

        // Connect to group
        const groupId = groupIds[student.group];
        if (groupId) {
          await supabase.from("instructor_students").upsert(
            {
              instructor_id: coachId,
              student_id: studentId,
              class_session_id: groupId,
            },
            { onConflict: "instructor_id,student_id,class_session_id" }
          );
          console.log(`   Connected to: ${student.group}`);
        }
      }
    }

    // 4. Create Sample Tasks (from templates)
    console.log("\n4. Creating sample tasks from templates...");

    for (const template of TEST_DATA.templates) {
      console.log(`   Template: ${template.name}`);

      const today = new Date();

      for (const task of template.tasks) {
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + task.day_offset);

        const { error: taskError } = await supabase.from("tasks").insert({
          user_id: coachId,
          title: task.title,
          description: task.description,
          duration_minutes: task.duration_minutes,
          due_date: dueDate.toISOString().split("T")[0],
          is_completed: false,
        });

        if (taskError) {
          console.error(`     Error creating task ${task.title}:`, taskError.message);
        } else {
          console.log(`     Created: ${task.title}`);
        }
      }
    }

    console.log("\n========================================");
    console.log("Seed completed successfully!");
    console.log("========================================");
    console.log("\nTest Accounts:");
    console.log(`  Coach: ${TEST_DATA.coach.email} / ${TEST_DATA.coach.password}`);
    TEST_DATA.students.forEach(s => {
      console.log(`  Student: ${s.email} / ${s.password}`);
    });
    console.log("\nGroups:");
    Object.entries(groupIds).forEach(([name, id]) => {
      console.log(`  ${name}: ${id}`);
    });

  } catch (error: any) {
    console.error("\nSeed failed:", error.message);
    process.exit(1);
  }
}

// Run the seed
seedDatabase();
