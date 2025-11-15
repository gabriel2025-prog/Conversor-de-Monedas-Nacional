// assets/js/app.js
const ENDPOINTS = {
  dolar: "https://mindicador.cl/api/dolar",
  euro: "https://mindicador.cl/api/euro",
  utm: "https://mindicador.cl/api/utm",
  uf: "https://mindicador.cl/api/uf",
  bitcoin: "https://mindicador.cl/api/bitcoin",
};

let tasas = {};

// Obtiene todas las tasas llamando a cada endpoint por separado
async function obtenerTasas() {
  try {
    const keys = Object.keys(ENDPOINTS);
    const respuestas = await Promise.all(keys.map((k) => fetch(ENDPOINTS[k])));

    const datos = await Promise.all(
      respuestas.map((r) => {
        if (!r.ok) throw new Error(`Error al obtener ${r.url}: ${r.status}`);
        return r.json();
      })
    );

    // Extrae el primer valor de la serie para cada moneda
    keys.forEach((k, i) => {
      // Algunos endpoints retornan 'serie' con historial; tomamos el valor más reciente
      tasas[k] =
        datos[i].serie && datos[i].serie.length > 0
          ? datos[i].serie[0].valor
          : null;
    });

    // simple verificación en consola (opcional)
    console.log("Tasas obtenidas:", tasas);
  } catch (error) {
    console.error("Error obteniendo tasas:", error);
    alert(
      "No se pudieron obtener las tasas desde mindicador.cl. Revisa la conexión o los endpoints."
    );
  }
}

/* ----------------- LOGICA DE CONVERSION ----------------- */
function formatearNumero(n, opts = { minimumFractionDigits: 2 }) {
  return Number(n).toLocaleString("es-CL", opts);
}

document.addEventListener("DOMContentLoaded", () => {
  obtenerTasas();
  cargarHistorial();
});

document.getElementById("btnConvertir").addEventListener("click", () => {
  const monto = Number(document.getElementById("monto").value);
  const moneda = document.getElementById("moneda").value; // debe coincidir con las claves: dolar,euro,uf,utm,bitcoin
  const tipo = document.getElementById("tipoConversion").value;
  const resultadoDiv = document.getElementById("resultadoValor");

  if (!monto || monto <= 0) {
    resultadoDiv.textContent = "Ingrese un monto válido.";
    return;
  }

  const tasa = tasas[moneda];

  if (tasa == null) {
    resultadoDiv.textContent =
      "Tasa no disponible. Intenta recargar la página.";
    return;
  }

  let resultadoText;
  if (tipo === "clpToFx") {
    // Convertir CLP a moneda extranjera: monto / tasa
    const convertido = monto / tasa;
    resultadoText = `${formatearNumero(convertido, {
      minimumFractionDigits: 2,
    })} ${moneda.toUpperCase()}`;
    guardarHistorial(
      `CLP ${formatearNumero(monto)} → ${formatearNumero(convertido, {
        minimumFractionDigits: 2,
      })} ${moneda.toUpperCase()}`
    );
  } else {
    // Convertir moneda extranjera a CLP: monto * tasa
    const convertido = monto * tasa;
    resultadoText = `${formatearNumero(convertido, {
      minimumFractionDigits: 0,
    })} CLP`;
    guardarHistorial(
      `${monto} ${moneda.toUpperCase()} → ${formatearNumero(convertido, {
        minimumFractionDigits: 0,
      })} CLP`
    );
  }

  resultadoDiv.textContent = resultadoText;
});

/* ---------------- HISTORIAL ---------------- */

function guardarHistorial(texto) {
  let historial = JSON.parse(localStorage.getItem("historial")) || [];
  historial.unshift(`${new Date().toLocaleString()} - ${texto}`);
  // limitamos a 50 entradas para no crecer indefinidamente
  if (historial.length > 50) historial = historial.slice(0, 50);
  localStorage.setItem("historial", JSON.stringify(historial));
  cargarHistorial();
}

function cargarHistorial() {
  const lista = document.getElementById("historialLista");
  lista.innerHTML = "";
  const historial = JSON.parse(localStorage.getItem("historial")) || [];
  historial.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    lista.appendChild(li);
  });
}

document.getElementById("btnLimpiarHistorial").addEventListener("click", () => {
  if (confirm("¿Eliminar historial de conversiones?")) {
    localStorage.removeItem("historial");
    cargarHistorial();
  }
});

// --- GRAFICO ---
let grafico = null;

async function cargarGrafico(moneda) {
  try {
    const url = ENDPOINTS[moneda];
    const response = await fetch(url);
    const data = await response.json();

    // Tomar los primeros 10 valores
    const ultimos10 = data.serie.slice(0, 10).reverse();

    const labels = ultimos10.map((d) => d.fecha.substring(0, 10));
    const valores = ultimos10.map((d) => d.valor);

    const ctx = document.getElementById("graficoMoneda").getContext("2d");

    // Si existe un gráfico previo, destruirlo
    if (grafico) grafico.destroy();

    grafico = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: `Historial últimos 10 días (${moneda.toUpperCase()})`,
            data: valores,
            borderColor: "rgba(255, 99, 132, 0.8)",
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            borderWidth: 3,
            tension: 0.3,
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              font: { size: 14 },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: false,
          },
        },
      },
    });
  } catch (err) {
    console.log("Error cargando gráfico:", err);
  }
}

// Activar el gráfico al seleccionar moneda//
document.getElementById("btnConvertir").addEventListener("click", () => {
  const moneda = document.getElementById("moneda").value;

  // tu código actual…
  // ...

  // cargar gráfico
  cargarGrafico(moneda);
});
