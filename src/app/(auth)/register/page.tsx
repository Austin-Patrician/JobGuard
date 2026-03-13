export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Register</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Create your account
          </p>
        </div>
        <form className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800"
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 transition-colors"
          >
            Create account
          </button>
        </form>
      </div>
    </div>
  );
}
