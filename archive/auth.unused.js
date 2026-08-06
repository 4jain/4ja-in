const AuthService = (() => {
    const sheetCsvUrl = 'https://docs.google.com/spreadsheets/d/1AN8Zea7RRqVz2m400Kmsk-RVQjn394wP8DXmQyOvxco/export?format=csv&gid=0';
    const keys = {
        isLoggedIn: 'is_logged_in',
        nomorHp: 'logged_in_nomor_hp',
        nama: 'logged_in_nama',
        status: 'logged_in_status',
    };

    function normalizeNomorHp(value) {
        const digitsOnly = String(value || '').replace(/[^0-9]/g, '');
        return digitsOnly.startsWith('0') ? `62${digitsOnly.slice(1)}` : digitsOnly;
    }

    function parseCsvLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    }

    function isLoggedIn() {
        return localStorage.getItem(keys.isLoggedIn) === 'true';
    }

    function getSession() {
        return {
            is_logged_in: localStorage.getItem(keys.isLoggedIn),
            nomor_hp: localStorage.getItem(keys.nomorHp),
            nama: localStorage.getItem(keys.nama),
            status: localStorage.getItem(keys.status),
        };
    }

    function saveSession(user) {
        localStorage.setItem(keys.isLoggedIn, 'true');
        localStorage.setItem(keys.nomorHp, user.nomor_hp);
        localStorage.setItem(keys.nama, user.nama);
        localStorage.setItem(keys.status, user.status);
    }

    async function login({ nomorHp, password }) {
        const normalizedNomorHp = normalizeNomorHp(nomorHp);
        const cleanPassword = String(password || '').trim();

        if (!normalizedNomorHp || !cleanPassword) {
            throw new Error('Nomor HP dan password wajib diisi');
        }

        const response = await fetch(sheetCsvUrl);

        if (!response.ok) {
            throw new Error(`Gagal membaca data Google Sheet. Kode: ${response.status}`);
        }

        const csvText = await response.text();
        const lines = csvText.split(/\r?\n/).filter((line) => line.trim());

        if (lines.length <= 1) {
            throw new Error('Data login di Google Sheet kosong.');
        }

        for (const line of lines.slice(1)) {
            const columns = parseCsvLine(line);
            if (columns.length < 5) continue;

            const sheetNomorHp = normalizeNomorHp(columns[0].trim());
            const sheetNama = columns[1]?.trim() || '';
            const sheetPassword = columns[3]?.trim() || '';
            const sheetStatus = columns[4]?.trim().toLowerCase() || '';

            if (sheetNomorHp === normalizedNomorHp && sheetPassword === cleanPassword) {
                if (sheetStatus !== 'umkm' && sheetStatus !== 'client') {
                    throw new Error(`Status akun "${sheetStatus}" tidak dikenali.`);
                }

                const user = {
                    nomor_hp: sheetNomorHp,
                    nama: sheetNama,
                    status: sheetStatus,
                };

                saveSession(user);
                return user;
            }
        }

        throw new Error('Nomor HP atau password tidak cocok.');
    }

    function logout() {
        localStorage.removeItem(keys.isLoggedIn);
        localStorage.removeItem(keys.nomorHp);
        localStorage.removeItem(keys.nama);
        localStorage.removeItem(keys.status);
    }

    function redirectBySession() {
    const session = getSession();

        if (session.is_logged_in === 'true' && session.status === 'umkm') {
            window.location.replace('halaman_umkm.html');
            return;
        }

        if (session.is_logged_in === 'true' && session.status === 'client') {
            window.location.replace('halaman_client.html');
            return;
        }

        window.location.replace('index.html');
    }

    return {
        normalizeNomorHp,
        isLoggedIn,
        getSession,
        login,
        logout,
        redirectBySession,
    };
})();
