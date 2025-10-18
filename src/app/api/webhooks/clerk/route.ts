import { prisma } from "@/lib/prisma";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

export async function POST(req: Request): Promise<NextResponse> {
  // Clerk webhook received
  const startTime = Date.now();
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("❌ CLERK_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  try {
    await prisma.$connect();
    // Database connection successful
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return NextResponse.json(
      { error: "Database connection failed" },
      { status: 500 }
    );
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("❌ Missing required svix headers");
    return NextResponse.json(
      { error: "Missing required webhook headers" },
      { status: 400 }
    );
  }

  const payload = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;
  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("❌ Error verifying webhook:", err);
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  const eventType = evt.type;
  // Processing webhook event

  try {
    if (eventType === "user.created") {
      const { id, email_addresses, first_name, last_name, image_url } =
        evt.data;
      const primaryEmail =
        email_addresses?.find(
          (email) => email.id === evt.data.primary_email_address_id
        )?.email_address ||
        email_addresses?.[0]?.email_address ||
        "";

      await prisma.profile.create({
        data: {
          id: id,
          email: primaryEmail,
          firstName: first_name || "",
          lastName: last_name || "",
          imageUrl: image_url || "",
        },
      });
      // User created in database
    }

    if (eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } =
        evt.data;
      const primaryEmail =
        email_addresses?.find(
          (email) => email.id === evt.data.primary_email_address_id
        )?.email_address ||
        email_addresses?.[0]?.email_address ||
        "";

      await prisma.profile.update({
        where: { id: id },
        data: {
          email: primaryEmail,
          firstName: first_name || "",
          lastName: last_name || "",
          imageUrl: image_url || "",
        },
      });
      // User updated in database
    }

    if (eventType === "user.deleted") {
      const { id } = evt.data;
      await prisma.profile.delete({
        where: { id: id },
      });
      // User deleted from database
    }

    if (!["user.created", "user.updated", "user.deleted"].includes(eventType)) {
      // Unsupported event type
      return NextResponse.json(
        { message: `Event type ${eventType} not handled`, eventType },
        { status: 200 }
      );
    }

    const duration = Date.now() - startTime;
    // Webhook processed successfully

    return NextResponse.json(
      { success: true, eventType, duration },
      { status: 200 }
    );
  } catch (error) {
    console.error(`❌ Error processing ${eventType}:`, error);
    return NextResponse.json(
      { error: `Failed to process ${eventType}` },
      { status: 500 }
    );
  }
}
