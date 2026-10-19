const REFERRALS_URL = '/api/v1/referrals'
const REFERRAL_CODE_PATTERN = /^[a-f0-9]{32}$/i

async function apiRequest(url) {
  let response

  try {
    response = await fetch(url, { credentials: 'include' })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Comprueba que esté en ejecución e inténtalo de nuevo.')
  }

  let result

  try {
    result = await response.json()
  } catch {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  if (!response.ok) {
    throw new Error(result?.error?.message || 'No se pudo completar la solicitud. Inténtalo de nuevo.')
  }

  return result
}

function readReferralOverview(result) {
  if (
    !result ||
    typeof result !== 'object' ||
    !REFERRAL_CODE_PATTERN.test(result?.referralCode) ||
    !Array.isArray(result?.students) ||
    !result.students.every((student) =>
      typeof student?.username === 'string' &&
      (student.fighter === null ||
        (
          typeof student.fighter?.name === 'string' &&
          Number.isSafeInteger(student.fighter.level) &&
          student.fighter.level > 0
        ))
    )
  ) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return { referralCode: result.referralCode, students: result.students }
}

export async function fetchReferralOverview() {
  return readReferralOverview(await apiRequest(`${REFERRALS_URL}/me`))
}
