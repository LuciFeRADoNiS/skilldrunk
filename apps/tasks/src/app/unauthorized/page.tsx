export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">Yetki yok</h1>
        <p className="text-neutral-500 mb-4">
          tasks.skilldrunk.com sadece admin erişimine açık.
        </p>
        <a
          href="https://admin.skilldrunk.com/login"
          className="text-sm underline text-neutral-300"
        >
          Admin login &rarr;
        </a>
      </div>
    </div>
  );
}
