import { Router } from "express";
import type { Request } from "express";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { userAuth } from "../middleware/userAuth";

type AuthedRequest = Request & { user?: User };

const router = Router();

router.get("/", userAuth, async (_req, res) => {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  const users = data.users.map((u) => ({
    id: u.id,
    email: u.email ?? "",
    full_name: (u.user_metadata?.full_name as string | undefined) ?? null,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
  }));
  res.json(users);
});

router.post("/invite", userAuth, async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "Email diperlukan" });
    return;
  }
  const { error } = await supabase.auth.admin.inviteUserByEmail(email);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});

router.delete("/:id", userAuth, async (req: AuthedRequest, res) => {
  const id = String(req.params["id"]);
  if (req.user?.id === id) {
    res.status(400).json({ error: "Tidak dapat menghapus akun sendiri" });
    return;
  }
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});

export default router;
