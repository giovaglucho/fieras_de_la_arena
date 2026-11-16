import Fighter from "../models/Fighter.js";
import User from "../models/User.js";

// Lista pública de las cuentas que se registraron con un código de la cuenta indicada.
export async function listStudentsForAccount(userId) {
  const students = await User.find({ referredByUserId: userId })
    .select("_id username activeFighterId")
    .sort({ createdAt: 1 })
    .lean();
  const studentFighters = await Fighter.find({
    userId: { $in: students.map((student) => student._id) }
  })
    .select("_id userId name displayName level")
    .lean();
  const fightersByUserId = new Map();
  for (const studentFighter of studentFighters) {
    const key = studentFighter.userId.toString();
    const ownedFighters = fightersByUserId.get(key) ?? [];
    ownedFighters.push(studentFighter);
    fightersByUserId.set(key, ownedFighters);
  }

  return students.map((student) => {
    const owned = fightersByUserId.get(student._id.toString()) ?? [];
    const selectedFighter = student.activeFighterId
      ? owned.find(({ _id }) => _id.equals(student.activeFighterId))
      : owned.length === 1
        ? owned[0]
        : null;

    return {
      username: student.username,
      fighter: selectedFighter
        ? { name: selectedFighter.displayName ?? selectedFighter.name, level: selectedFighter.level }
        : null
    };
  });
}

// El dojo pertenece a la cuenta: cualquier código de sus luchadores atribuye a la misma cuenta.
// Se usa el del luchador activo y, si no hay activo, el de la ficha más antigua.
export async function findReferralCodeForAccount(user) {
  if (user.activeFighterId != null) {
    const active = await Fighter.findOne({ _id: user.activeFighterId, userId: user._id })
      .select("referralCode")
      .lean();
    if (active) {
      return active.referralCode;
    }
  }
  const oldest = await Fighter.findOne({ userId: user._id })
    .sort({ createdAt: 1, _id: 1 })
    .select("referralCode")
    .lean();
  return oldest?.referralCode ?? null;
}
