const { GoogleGenAI } = require('@google/genai');

const fs = require('fs/promises');
const path = require('path');


// =====================================================
// GEMINI CLIENT
// =====================================================

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});


// =====================================================
// HELPER
// =====================================================

const clamp = (value, min = 0, max = 100) => {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return min;
    }

    return Math.max(
        min,
        Math.min(max, number)
    );
};


const round = (value) => {
    return Math.round(Number(value) || 0);
};


const getMimeType = (imagePath) => {

    const extension =
        path.extname(imagePath)
            .toLowerCase();

    if (extension === '.png') {
        return 'image/png';
    }

    if (extension === '.webp') {
        return 'image/webp';
    }

    if (extension === '.jpg' ||
        extension === '.jpeg') {
        return 'image/jpeg';
    }

    return 'image/jpeg';
};


const normalizeArray = (value) => {

    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter(
            item =>
                typeof item === 'string' &&
                item.trim().length > 0
        )
        .map(item => item.trim());
};


// =====================================================
// HITUNG CONFIDENCE
// =====================================================
//
// Confidence tidak lagi langsung mengambil angka
// dari Gemini.
//
// Gemini memberikan beberapa komponen:
//
// visual_clarity
// plant_identification_confidence
// condition_confidence
// diagnosis_confidence
//
// FARMORA menghitung nilai akhirnya.
//

const calculateConfidence = (result) => {

    const visualClarity =
        clamp(result.visual_clarity);

    const plantIdentification =
        clamp(
            result.plant_identification_confidence
        );

    const conditionConfidence =
        clamp(
            result.condition_confidence
        );

    const diagnosisConfidence =
        clamp(
            result.diagnosis_confidence
        );


    // Jika foto tidak jelas,
    // confidence tidak boleh tinggi.

    if (result.condition === 'uncertain') {

        return Math.min(
            40,
            round(
                (
                    visualClarity * 0.40
                ) +
                (
                    plantIdentification * 0.20
                ) +
                (
                    conditionConfidence * 0.20
                ) +
                (
                    diagnosisConfidence * 0.20
                )
            )
        );

    }


    const confidence =

        (
            visualClarity * 0.25
        ) +

        (
            plantIdentification * 0.20
        ) +

        (
            conditionConfidence * 0.20
        ) +

        (
            diagnosisConfidence * 0.35
        );


    return clamp(
        round(confidence)
    );
};


// =====================================================
// ANALISIS GAMBAR TANAMAN
// =====================================================
//
// Digunakan oleh Pest Detection.
//
// POST /api/ai-detection/images/:id/analyze
// =====================================================

const analyzePlantImage = async (
    imagePath,
    cropName,
    variety
) => {

    // =================================================
    // VALIDASI API KEY
    // =================================================

    if (!process.env.GEMINI_API_KEY) {

        throw new Error(
            'GEMINI_API_KEY belum dikonfigurasi.'
        );

    }


    // =================================================
    // VALIDASI FILE
    // =================================================

    const absolutePath =
        path.resolve(imagePath);

    const imageBuffer =
        await fs.readFile(
            absolutePath
        );


    // =================================================
    // BASE64
    // =================================================

    const base64Image =
        imageBuffer.toString('base64');


    // =================================================
    // MIME TYPE
    // =================================================

    const mimeType =
        getMimeType(imagePath);


    // =================================================
    // PROMPT AI
    // =================================================

    const prompt = `

Anda adalah AI Vision untuk sistem FARMORA,
sebuah Smart Farm Management System.

Tugas Anda adalah menganalisis kondisi tanaman
berdasarkan bukti visual yang terlihat pada foto.

INFORMASI TANAMAN:

Nama tanaman:
${cropName || 'Tidak diketahui'}

Varietas:
${variety || 'Tidak diketahui'}


==================================================
ATURAN UTAMA
==================================================

1. Gunakan hanya bukti yang benar-benar terlihat
   pada gambar dan konteks tanaman yang diberikan.

2. Jangan mengarang penyakit, hama, gejala,
   atau penyebab yang tidak memiliki dukungan visual.

3. Hasil ini bukan diagnosis pasti.

4. Jika foto buram, terlalu gelap, terlalu jauh,
   objek tanaman terlalu kecil, atau gejala tidak
   terlihat jelas, gunakan:

   condition = "uncertain"

5. Jika terdapat beberapa kemungkinan diagnosis,
   confidence diagnosis harus diturunkan.

6. Jangan memberikan confidence tinggi hanya karena
   sebuah penyakit terdengar cocok.

7. Confidence harus mencerminkan kualitas bukti
   visual, bukan seberapa umum penyakit tersebut.

8. Jangan menggunakan 85 sebagai nilai default.

9. Jangan selalu menggunakan angka yang sama.

10. Gunakan angka yang berbeda berdasarkan kualitas
    bukti yang benar-benar terlihat.


==================================================
KONDISI TANAMAN
==================================================

Pilih salah satu:

healthy
problem
uncertain


==================================================
ANALISIS
==================================================

Jika condition = problem:

Identifikasi kemungkinan:

- penyakit
- hama
- kekurangan nutrisi
- kerusakan fisik
- gangguan lainnya

Jelaskan:

- gejala yang terlihat
- kemungkinan penyebab
- observasi visual
- rekomendasi tindakan awal yang aman


==================================================
CONFIDENCE
==================================================

JANGAN langsung menentukan satu angka confidence.

Nilai terlebih dahulu empat komponen berikut:

1. visual_clarity

Seberapa jelas foto menunjukkan bagian tanaman
yang relevan?

0-20:
Sangat buruk / hampir tidak bisa dianalisis

21-40:
Buruk

41-60:
Cukup

61-80:
Jelas

81-100:
Sangat jelas


2. plant_identification_confidence

Seberapa yakin Anda bahwa tanaman berhasil
diidentifikasi dengan benar?

0-20:
Tidak dapat diidentifikasi

21-40:
Sangat tidak yakin

41-60:
Cukup yakin

61-80:
Yakin

81-100:
Sangat yakin


3. condition_confidence

Seberapa yakin Anda bahwa kondisi tanaman
healthy/problem/uncertain sesuai dengan bukti foto?


4. diagnosis_confidence

Seberapa kuat bukti visual mendukung diagnosis
yang diberikan?

Jika terdapat dua atau lebih diagnosis yang
sama-sama masuk akal, nilai ini harus turun.

Jika diagnosis hanya berdasarkan dugaan umum
tanpa gejala khas yang terlihat, nilai ini harus
rendah.

Jangan memberikan nilai tinggi hanya karena
diagnosis tersebut umum terjadi pada tanaman.


==================================================
ATURAN NILAI
==================================================

Jangan menggunakan 85 sebagai default.

Contoh:

Foto sangat jelas dan gejala sangat khas:
visual_clarity = 90
diagnosis_confidence = 92

Foto cukup jelas tetapi diagnosis masih ambigu:
visual_clarity = 70
diagnosis_confidence = 55

Foto kurang jelas:
visual_clarity = 40
diagnosis_confidence = 30

Foto tidak dapat dianalisis:
visual_clarity = 15
condition = "uncertain"


==================================================
REKOMENDASI
==================================================

Berikan tindakan awal yang aman dan praktis.

Jangan memberikan dosis pestisida atau fungisida
secara spesifik jika informasi tidak cukup.

Jika hasil uncertain, rekomendasikan pemeriksaan
foto yang lebih jelas atau pemeriksaan langsung
pada tanaman.


==================================================
FORMAT JSON
==================================================

Hanya berikan JSON valid.

{
    "condition": "healthy | problem | uncertain",
    "diagnosis": "string",

    "visual_clarity": 0,
    "plant_identification_confidence": 0,
    "condition_confidence": 0,
    "diagnosis_confidence": 0,

    "confidence": 0,

    "symptoms": [],
    "possible_causes": [],
    "recommendation": "string",
    "observation": "string"
}

CATATAN:

Field "confidence" tetap harus diisi,
tetapi FARMORA akan menghitung ulang
confidence final berdasarkan empat komponen
di atas.

Jangan membuat semua nilai sama.

Jangan menggunakan 85 secara otomatis.
`;


    // =================================================
    // REQUEST KE GEMINI
    // =================================================

    console.log(
        'Mengirim gambar ke Gemini...'
    );


    const response =
        await ai.models.generateContent({

            model:
                'gemini-3.5-flash-lite',

            contents: [

                {
                    inlineData: {

                        mimeType,

                        data:
                            base64Image,

                    },

                },

                {
                    text:
                        prompt,
                },

            ],

            config: {

                responseMimeType:
                    'application/json',

            },

        });


    // =================================================
    // RESPONSE
    // =================================================

    const output =
        response.text;


    console.log(
        'Response Gemini:',
        output
    );


    if (!output) {

        throw new Error(
            'Gemini tidak memberikan hasil analisis.'
        );

    }


    // =================================================
    // PARSE JSON
    // =================================================

    try {

        const result =
            JSON.parse(output);


        // =============================================
        // VALIDASI CONDITION
        // =============================================

        const validConditions = [
            'healthy',
            'problem',
            'uncertain',
        ];


        if (
            !validConditions.includes(
                result.condition
            )
        ) {

            result.condition =
                'uncertain';

        }


        // =============================================
        // NORMALISASI CONFIDENCE COMPONENTS
        // =============================================

        result.visual_clarity =
            clamp(
                result.visual_clarity
            );

        result.plant_identification_confidence =
            clamp(
                result.plant_identification_confidence
            );

        result.condition_confidence =
            clamp(
                result.condition_confidence
            );

        result.diagnosis_confidence =
            clamp(
                result.diagnosis_confidence
            );


        // =============================================
        // HITUNG CONFIDENCE FINAL
        // =============================================

        result.confidence =
            calculateConfidence(
                result
            );


        // =============================================
        // VALIDASI ARRAY
        // =============================================

        result.symptoms =
            normalizeArray(
                result.symptoms
            );

        result.possible_causes =
            normalizeArray(
                result.possible_causes
            );


        // =============================================
        // DEFAULT VALUE
        // =============================================

        result.diagnosis =
            result.diagnosis ||
            'Tidak dapat ditentukan';


        result.recommendation =
            result.recommendation ||
            'Tidak ada rekomendasi khusus.';


        result.observation =
            result.observation ||
            'Tidak ada observasi tambahan.';


        // =============================================
        // UNCERTAIN PROTECTION
        // =============================================

        if (
            result.condition ===
            'uncertain'
        ) {

            result.confidence =
                Math.min(
                    result.confidence,
                    40
                );

        }


        // =============================================
        // LOG CONFIDENCE
        // =============================================

        console.log(
            'Confidence components:',
            {
                visual_clarity:
                    result.visual_clarity,

                plant_identification_confidence:
                    result.plant_identification_confidence,

                condition_confidence:
                    result.condition_confidence,

                diagnosis_confidence:
                    result.diagnosis_confidence,

                final_confidence:
                    result.confidence,
            }
        );


        return result;


    } catch (error) {

        console.error(
            'Gemini JSON parsing error:',
            error
        );


        console.error(
            'Raw Gemini response:',
            output
        );


        throw new Error(
            'Format hasil Gemini tidak valid.'
        );

    }

};


// =====================================================
// QUICK PLANT SCAN
// =====================================================
//
// Tidak membutuhkan Crop Cycle.
//
// POST /api/ai-detection/quick-scan
// =====================================================

const analyzeQuickPlantImage = async (
    imagePath
) => {

    // =================================================
    // VALIDASI API KEY
    // =================================================

    if (!process.env.GEMINI_API_KEY) {

        throw new Error(
            'GEMINI_API_KEY belum dikonfigurasi.'
        );

    }


    // =================================================
    // VALIDASI FILE
    // =================================================

    const absolutePath =
        path.resolve(
            imagePath
        );


    const imageBuffer =
        await fs.readFile(
            absolutePath
        );


    // =================================================
    // BASE64
    // =================================================

    const base64Image =
        imageBuffer.toString(
            'base64'
        );


    // =================================================
    // MIME TYPE
    // =================================================

    const mimeType =
        getMimeType(imagePath);


    // =================================================
    // PROMPT QUICK SCAN
    // =================================================

    const prompt = `

Anda adalah AI Vision untuk FARMORA,
sebuah Smart Farm Management System.

Ini adalah mode QUICK PLANT SCAN.

Pengguna mengupload foto tanaman secara bebas
tanpa memilih Crop Cycle.

Tugas Anda:

1. Identifikasi tanaman jika memungkinkan.

2. Tentukan kondisi tanaman.

3. Jika ada masalah, identifikasi kemungkinan
   penyakit, hama, kekurangan nutrisi,
   kerusakan fisik, atau gangguan lainnya.

4. Jelaskan gejala yang benar-benar terlihat.

5. Jelaskan kemungkinan penyebab.

6. Berikan rekomendasi tindakan awal yang aman.

7. Jangan menganggap hasil sebagai diagnosis pasti.


==================================================
KONDISI
==================================================

Gunakan:

healthy
problem
uncertain


==================================================
ATURAN IDENTIFIKASI
==================================================

Jika tanaman tidak dapat diidentifikasi dengan
cukup yakin:

plant_name =
"Tidak dapat diidentifikasi"


Jika foto:

- buram
- terlalu gelap
- terlalu jauh
- tanaman terlalu kecil
- hanya sebagian kecil tanaman terlihat
- gejala tidak terlihat

maka gunakan:

condition = "uncertain"


Jangan mengarang penyakit atau hama.


==================================================
CONFIDENCE
==================================================

Jangan memberikan satu angka confidence secara
asal.

Nilai empat komponen secara terpisah:

1. visual_clarity
2. plant_identification_confidence
3. condition_confidence
4. diagnosis_confidence


--------------------------------------------------
VISUAL CLARITY
--------------------------------------------------

0-20:
Sangat buruk

21-40:
Buruk

41-60:
Cukup

61-80:
Jelas

81-100:
Sangat jelas


--------------------------------------------------
PLANT IDENTIFICATION
--------------------------------------------------

0-20:
Tidak dapat diidentifikasi

21-40:
Sangat tidak yakin

41-60:
Cukup yakin

61-80:
Yakin

81-100:
Sangat yakin


--------------------------------------------------
CONDITION CONFIDENCE
--------------------------------------------------

Nilai berdasarkan seberapa jelas foto mendukung
healthy, problem, atau uncertain.


--------------------------------------------------
DIAGNOSIS CONFIDENCE
--------------------------------------------------

Nilai berdasarkan kekuatan bukti visual.

Jika diagnosis hanya dugaan:

nilai harus rendah.

Jika terdapat beberapa kemungkinan:

turunkan nilai.

Jika gejala sangat khas dan terlihat jelas:

nilai dapat tinggi.


==================================================
ATURAN PENTING
==================================================

JANGAN menggunakan 85 sebagai default.

JANGAN memberikan angka yang sama untuk semua
komponen hanya karena mudah.

JANGAN memberikan confidence tinggi hanya karena
diagnosis tersebut umum.

Confidence harus mengikuti kualitas bukti foto.


Contoh:

Foto sangat jelas + gejala khas:

visual_clarity = 92
plant_identification_confidence = 94
condition_confidence = 90
diagnosis_confidence = 91


Foto cukup jelas tetapi diagnosis ambigu:

visual_clarity = 68
plant_identification_confidence = 82
condition_confidence = 70
diagnosis_confidence = 52


Foto kurang jelas:

visual_clarity = 38
plant_identification_confidence = 45
condition_confidence = 35
diagnosis_confidence = 25


Foto tidak dapat dianalisis:

condition = "uncertain"

visual_clarity = 15
plant_identification_confidence = 10
condition_confidence = 20
diagnosis_confidence = 5


==================================================
REKOMENDASI
==================================================

Berikan tindakan awal yang aman dan praktis.

Jangan memberikan dosis pestisida atau fungisida
secara spesifik jika informasi tidak cukup.

Jika uncertain, sarankan mengambil foto yang lebih
jelas atau melakukan pemeriksaan langsung.


==================================================
FORMAT JSON
==================================================

Hanya JSON valid.

{
    "plant_name": "string",

    "condition":
        "healthy | problem | uncertain",

    "diagnosis": "string",

    "visual_clarity": 0,

    "plant_identification_confidence": 0,

    "condition_confidence": 0,

    "diagnosis_confidence": 0,

    "confidence": 0,

    "symptoms": [],

    "possible_causes": [],

    "recommendation": "string",

    "observation": "string"
}


CATATAN:

Field "confidence" tetap harus diisi,
tetapi FARMORA akan menghitung ulang nilai
confidence final berdasarkan empat komponen.

Jangan menggunakan 85 sebagai default.
`;


    // =================================================
    // REQUEST GEMINI
    // =================================================

    console.log(
        'Mengirim Quick Plant Scan ke Gemini...'
    );


    const response =
        await ai.models.generateContent({

            model:
                'gemini-3.5-flash-lite',

            contents: [

                {
                    inlineData: {

                        mimeType,

                        data:
                            base64Image,

                    },

                },

                {
                    text:
                        prompt,
                },

            ],

            config: {

                responseMimeType:
                    'application/json',

            },

        });


    // =================================================
    // RESPONSE
    // =================================================

    const output =
        response.text;


    console.log(
        'Response Quick Scan:',
        output
    );


    if (!output) {

        throw new Error(
            'Gemini tidak memberikan hasil Quick Scan.'
        );

    }


    // =================================================
    // PARSE JSON
    // =================================================

    try {

        const result =
            JSON.parse(
                output
            );


        // =============================================
        // VALIDASI CONDITION
        // =============================================

        const validConditions = [
            'healthy',
            'problem',
            'uncertain',
        ];


        if (
            !validConditions.includes(
                result.condition
            )
        ) {

            result.condition =
                'uncertain';

        }


        // =============================================
        // NORMALISASI COMPONENTS
        // =============================================

        result.visual_clarity =
            clamp(
                result.visual_clarity
            );


        result.plant_identification_confidence =
            clamp(
                result.plant_identification_confidence
            );


        result.condition_confidence =
            clamp(
                result.condition_confidence
            );


        result.diagnosis_confidence =
            clamp(
                result.diagnosis_confidence
            );


        // =============================================
        // HITUNG CONFIDENCE FINAL
        // =============================================

        result.confidence =
            calculateConfidence(
                result
            );


        // =============================================
        // VALIDASI ARRAY
        // =============================================

        result.symptoms =
            normalizeArray(
                result.symptoms
            );


        result.possible_causes =
            normalizeArray(
                result.possible_causes
            );


        // =============================================
        // DEFAULT VALUE
        // =============================================

        result.plant_name =
            result.plant_name ||
            'Tidak dapat diidentifikasi';


        result.diagnosis =
            result.diagnosis ||
            'Tidak dapat ditentukan';


        result.recommendation =
            result.recommendation ||
            'Tidak ada rekomendasi khusus.';


        result.observation =
            result.observation ||
            'Tidak ada observasi tambahan.';


        // =============================================
        // UNCERTAIN PROTECTION
        // =============================================

        if (
            result.condition ===
            'uncertain'
        ) {

            result.confidence =
                Math.min(
                    result.confidence,
                    40
                );

        }


        // =============================================
        // LOG CONFIDENCE
        // =============================================

        console.log(
            'Quick Scan confidence components:',
            {

                visual_clarity:
                    result.visual_clarity,

                plant_identification_confidence:
                    result.plant_identification_confidence,

                condition_confidence:
                    result.condition_confidence,

                diagnosis_confidence:
                    result.diagnosis_confidence,

                final_confidence:
                    result.confidence,

            }
        );


        return result;


    } catch (error) {

        console.error(
            'Quick Scan JSON parsing error:',
            error
        );


        console.error(
            'Raw Gemini response:',
            output
        );


        throw new Error(
            'Format hasil Quick Scan tidak valid.'
        );

    }

};


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    analyzePlantImage,

    analyzeQuickPlantImage,

};