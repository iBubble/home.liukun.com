import time, socket

def get_ping(host, port=22):
    try:
        start_time = time.time()
        s = socket.create_connection((host, int(port)), timeout=2)
        # Wait for the SSH banner to arrive
        banner = s.recv(1024)
        latency = round((time.time() - start_time) * 1000, 1)
        s.close()
        return latency, banner.decode().strip()
    except Exception as e:
        return 0.0, str(e)

print(get_ping('hk.liukun.com'))
