# 极简 Android 二进制 AXML 解析器（只取 manifest 的 versionCode / versionName / package）
# 用途：审计 APK 版本号，只读，不依赖任何第三方库
import zipfile, struct, sys

def parse_axml(data):
    # 文件头：0x00080003 magic + 文件大小
    assert struct.unpack('<I', data[0:4])[0] == 0x00080003, 'not AXML'
    # 字符串池
    off = 8
    tag, hdr_size, chunk_size = struct.unpack('<HHI', data[off:off+8])
    assert tag == 0x0001, 'no string pool at 8, got 0x%04x' % tag
    scount, style_count, flags, sstart, stotal = struct.unpack('<IIIII', data[off+8:off+28])
    utf8 = bool(flags & (1 << 8))
    offsets = struct.unpack('<%dI' % scount, data[off+28:off+28+4*scount])
    base = off + sstart
    strings = []
    for o in offsets:
        p = base + o
        if utf8:
            # utf8：先 u8 字符数(可能两字节)，再 u8 字节数(可能两字节)，再数据
            n = data[p]; p += 1
            if n & 0x80: n = ((n & 0x7f) << 8) | data[p]; p += 1
            m = data[p]; p += 1
            if m & 0x80: m = ((m & 0x7f) << 8) | data[p]; p += 1
            strings.append(data[p:p+m].decode('utf-8', 'replace'))
        else:
            n = struct.unpack('<H', data[p:p+2])[0]; p += 2
            if n & 0x8000: n = ((n & 0x7fff) << 16) | struct.unpack('<H', data[p:p+2])[0]; p += 2
            strings.append(data[p:p+2*n].decode('utf-16-le', 'replace'))
    # 遍历后续 chunk 找 START_TAG，读属性
    p = off + chunk_size
    out = []
    while p + 8 <= len(data):
        t, hs, cs = struct.unpack('<HHI', data[p:p+8])
        if t == 0x0102:  # START_TAG
            ns_i, name_i = struct.unpack('<iI', data[p+16:p+24])
            attr_count = struct.unpack('<H', data[p+28:p+30])[0]
            attr_start = p + 36
            attrs = {}
            for i in range(attr_count):
                q = attr_start + i*20
                a_ns, a_name, a_raw, a_type, a_data = struct.unpack('<iiIIi', data[q:q+20])
                key = strings[a_name] if a_name < len(strings) else '?'
                val = strings[a_raw] if (a_raw != 0xFFFFFFFF and a_raw < len(strings)) else a_data
                attrs[key] = val
            out.append((strings[name_i], attrs))
        if cs == 0: break
        p += cs
    return strings, out

apk = sys.argv[1]
z = zipfile.ZipFile(apk)
strings, tags = parse_axml(z.read('AndroidManifest.xml'))
for name, attrs in tags:
    if name == 'manifest':
        print('package       =', attrs.get('package'))
        print('versionCode   =', attrs.get('versionCode'))
        print('versionName   =', attrs.get('versionName'))
    if name in ('uses-sdk',):
        print('minSdk        =', attrs.get('minSdkVersion'))
        print('targetSdk     =', attrs.get('targetSdkVersion'))
