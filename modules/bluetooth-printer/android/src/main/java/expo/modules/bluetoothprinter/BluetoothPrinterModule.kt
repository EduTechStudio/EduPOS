package expo.modules.bluetoothprinter

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.OutputStream
import java.util.UUID

class BluetoothPrinterModule : Module() {
  private var activeSocket: BluetoothSocket? = null
  private var activeOutputStream: OutputStream? = null
  private var connectedAddress: String? = null
  private var connectedName: String? = null
  private val stateLock = Any()

  // Standard Bluetooth Serial Port Profile (SPP) UUID
  private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

  private fun getAdapter(): BluetoothAdapter? {
    val context = appContext.reactContext
    val manager = context?.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    return manager?.adapter ?: BluetoothAdapter.getDefaultAdapter()
  }

  override fun definition() = ModuleDefinition {
    Name("BluetoothPrinter")

    OnDestroy {
      disconnectInternal()
    }

    AsyncFunction("isBluetoothEnabled") {
      try {
        val adapter = getAdapter()
        adapter != null && adapter.isEnabled
      } catch (_: SecurityException) {
        false
      } catch (_: Exception) {
        false
      }
    }

    AsyncFunction("getPairedDevices") {
      val adapter = getAdapter()
        ?: throw Exception("Perangkat ini tidak memiliki adaptor Bluetooth.")
      
      try {
        if (!adapter.isEnabled) {
          throw Exception("Bluetooth sedang nonaktif. Harap nyalakan Bluetooth di pengaturan perangkat.")
        }
      } catch (e: SecurityException) {
        throw Exception("Izin Bluetooth belum diberikan untuk memeriksa status Bluetooth.")
      }

      val bonded = try {
        adapter.bondedDevices ?: emptySet<BluetoothDevice>()
      } catch (e: SecurityException) {
        throw Exception("Izin Bluetooth Connect diperlukan untuk melihat perangkat yang telah dipasangkan.")
      }

      val list = ArrayList<Map<String, String>>()
      for (device in bonded) {
        val map = HashMap<String, String>()
        val deviceName = try {
          device.name ?: "Perangkat Tidak Dikenal"
        } catch (_: SecurityException) {
          "Perangkat Bluetooth"
        } catch (_: Exception) {
          "Perangkat Tidak Dikenal"
        }
        map["name"] = deviceName
        map["address"] = device.address
        list.add(map)
      }
      list
    }

    AsyncFunction("connect") { address: String ->
      val adapter = getAdapter()
        ?: throw Exception("Perangkat ini tidak memiliki adaptor Bluetooth.")
      
      try {
        if (!adapter.isEnabled) {
          throw Exception("Bluetooth sedang nonaktif. Harap aktifkan Bluetooth terlebih dahulu.")
        }
      } catch (e: SecurityException) {
        throw Exception("Izin Bluetooth belum diberikan.")
      }

      // Close any existing active connection cleanly before connecting
      disconnectInternal()

      try {
        adapter.cancelDiscovery()
      } catch (_: SecurityException) {} catch (_: Exception) {}

      val device = try {
        adapter.getRemoteDevice(address)
      } catch (e: Exception) {
        throw Exception("Alamat printer tidak valid: $address")
      } ?: throw Exception("Printer dengan alamat $address tidak ditemukan.")

      var socket: BluetoothSocket? = null
      var connectionError: Exception? = null

      // Attempt 1: Standard SPP UUID connection
      try {
        val standardSocket = device.createRfcommSocketToServiceRecord(SPP_UUID)
        standardSocket.connect()
        socket = standardSocket
      } catch (e: SecurityException) {
        throw Exception("Izin Bluetooth Connect ditolak sistem.")
      } catch (e: Exception) {
        connectionError = e
        try { socket?.close() } catch (_: Exception) {}
        socket = null
      }

      // Attempt 2: Fallback RFCOMM channel 1 via reflection (vital for Iware / ESC-POS chipsets)
      if (socket == null || !socket.isConnected) {
        try {
          // Allow Bluetooth controller a short interval to reset channel state
          Thread.sleep(150)
        } catch (_: InterruptedException) {}

        try {
          val createRfcommMethod = device.javaClass.getMethod("createRfcommSocket", Int::class.javaPrimitiveType)
          val fallbackSocket = createRfcommMethod.invoke(device, 1) as? BluetoothSocket
          fallbackSocket?.connect()
          socket = fallbackSocket
        } catch (e: SecurityException) {
          throw Exception("Izin Bluetooth Connect ditolak sistem.")
        } catch (fallbackEx: Exception) {
          try { socket?.close() } catch (_: Exception) {}
          socket = null
          val detail = connectionError?.message ?: fallbackEx.message ?: "Koneksi gagal"
          throw Exception("Gagal terhubung ke printer ($address). Pastikan printer menyala, Bluetooth aktif, dan berada dalam jangkauan. Detail: $detail")
        }
      }

      if (socket == null || !socket.isConnected) {
        throw Exception("Gagal membuat koneksi RFCOMM ke printer ($address).")
      }

      synchronized(stateLock) {
        activeSocket = socket
        activeOutputStream = socket.outputStream
        connectedAddress = address
        connectedName = try { device.name ?: "Iware Printer" } catch (_: SecurityException) { "Iware Printer" } catch (_: Exception) { "Iware Printer" }
      }
      true
    }

    AsyncFunction("disconnect") {
      disconnectInternal()
      true
    }

    AsyncFunction("isConnected") {
      synchronized(stateLock) {
        val socket = activeSocket
        socket != null && socket.isConnected
      }
    }

    AsyncFunction("getConnectedDevice") {
      synchronized(stateLock) {
        if (activeSocket?.isConnected == true && connectedAddress != null) {
          mapOf(
            "name" to (connectedName ?: "Printer"),
            "address" to connectedAddress!!
          )
        } else {
          null
        }
      }
    }

    AsyncFunction("writeBase64") { base64Data: String ->
      synchronized(stateLock) {
        val socket = activeSocket
        val stream = activeOutputStream
        if (socket == null || !socket.isConnected || stream == null) {
          throw Exception("Printer belum terhubung. Harap sambungkan printer terlebih dahulu.")
        }

        try {
          val bytes = Base64.decode(base64Data, Base64.DEFAULT)
          stream.write(bytes)
          stream.flush()
          true
        } catch (e: Exception) {
          disconnectInternal()
          throw Exception("Gagal mengirim data cetak ke printer: ${e.message}")
        }
      }
    }

    AsyncFunction("decodeImageToRaster") { source: String, maxWidth: Int, maxHeight: Int ->
      try {
        val bitmap = loadBitmap(source) ?: return@AsyncFunction null
        val (scaledBitmap, w, h) = scaleBitmap(bitmap, maxWidth, maxHeight)
        val rasterBytes = convertBitmapToMonochromeRaster(scaledBitmap, w, h)
        if (scaledBitmap != bitmap) {
          scaledBitmap.recycle()
        }
        bitmap.recycle()
        mapOf(
          "width" to w,
          "height" to h,
          "data" to rasterBytes.map { it.toInt() and 0xFF }
        )
      } catch (_: Exception) {
        null
      }
    }
  }

  private fun loadBitmap(source: String): Bitmap? {
    return try {
      when {
        source.startsWith("data:image") -> {
          val base64Data = source.substringAfter("base64,")
          val bytes = Base64.decode(base64Data, Base64.DEFAULT)
          BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        }
        source.startsWith("file://") -> {
          val path = source.removePrefix("file://")
          BitmapFactory.decodeFile(path)
        }
        source.startsWith("content://") -> {
          val uri = Uri.parse(source)
          appContext.reactContext?.contentResolver?.openInputStream(uri)?.use { stream ->
            BitmapFactory.decodeStream(stream)
          }
        }
        source.startsWith("/") -> {
          BitmapFactory.decodeFile(source)
        }
        else -> {
          try {
            val bytes = Base64.decode(source, Base64.DEFAULT)
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
          } catch (_: Exception) {
            BitmapFactory.decodeFile(source)
          }
        }
      }
    } catch (_: Exception) {
      null
    }
  }

  private fun scaleBitmap(bitmap: Bitmap, maxWidth: Int, maxHeight: Int): Triple<Bitmap, Int, Int> {
    val origW = bitmap.width
    val origH = bitmap.height
    val targetMaxWidth = if (maxWidth > 0) maxWidth else 384
    val targetMaxHeight = if (maxHeight > 0) maxHeight else 200

    var w = origW
    var h = origH

    if (w > targetMaxWidth) {
      h = Math.max(1, (h.toDouble() * targetMaxWidth / w).toInt())
      w = targetMaxWidth
    }
    if (h > targetMaxHeight) {
      w = Math.max(1, (w.toDouble() * targetMaxHeight / h).toInt())
      h = targetMaxHeight
    }

    // Align width to multiple of 8 dots for optimal raster printing
    w = (w / 8) * 8
    if (w < 8) w = 8

    val scaled = if (w != origW || h != origH) {
      Bitmap.createScaledBitmap(bitmap, w, h, true)
    } else {
      bitmap
    }
    return Triple(scaled, w, h)
  }

  private fun convertBitmapToMonochromeRaster(bitmap: Bitmap, width: Int, height: Int): ByteArray {
    val widthBytes = (width + 7) / 8
    val buffer = ByteArray(widthBytes * height)

    for (y in 0 until height) {
      for (x in 0 until width) {
        val pixel = bitmap.getPixel(x, y)
        val alpha = (pixel shr 24) and 0xFF
        val isBlack = if (alpha < 128) {
          false
        } else {
          val r = (pixel shr 16) and 0xFF
          val g = (pixel shr 8) and 0xFF
          val b = pixel and 0xFF
          val luminance = (0.299 * r + 0.587 * g + 0.114 * b).toInt()
          luminance < 128
        }

        if (isBlack) {
          val byteIndex = y * widthBytes + (x / 8)
          val bitIndex = 7 - (x % 8)
          buffer[byteIndex] = (buffer[byteIndex].toInt() or (1 shl bitIndex)).toByte()
        }
      }
    }
    return buffer
  }

  private fun disconnectInternal() {
    synchronized(stateLock) {
      try {
        activeOutputStream?.flush()
      } catch (_: Exception) {}
      try {
        activeOutputStream?.close()
      } catch (_: Exception) {}
      try {
        activeSocket?.close()
      } catch (_: Exception) {}
      activeOutputStream = null
      activeSocket = null
      connectedAddress = null
      connectedName = null
    }
  }
}
