import Image from "next/image";
import prisma from "@/lib/prisma";

// Theme type definition
type Theme = {
  id: number;
  name: string;
  color: string | null;
  logoPath: string | null;
  description: string | null;
};

async function getThemes() {
  try {
    // Fetch themes directly from the database since this is a public page
    const themes = await prisma.theme.findMany({
      orderBy: { name: "asc" },
    });
    return themes;
  } catch (error) {
    console.error("Error fetching themes:", error);
    return [];
  }
}

export default async function ThemesSection() {
  const themes = await getThemes();

  return (
    <section className="py-16 bg-black bg-opacity-20">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-red-500 to-blue-500">
            Techlympics 2025 Competition Themes
          </span>
        </h2>
        <p className="text-center text-gray-300 mb-12 max-w-3xl mx-auto">
          Explore our exciting competition themes for Techlympics 2025. Each theme represents a unique technological domain where participants can showcase their skills and innovation.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {themes.length > 0 ? (
            themes.map((theme: Theme) => (
              <div 
                key={theme.id} 
                className="bg-gradient-to-br from-gray-900 to-indigo-900 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col"
              >
                <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-800 relative flex items-center justify-center p-4">
                  {theme.logoPath ? (
                    <Image 
                      src={theme.logoPath} 
                      alt={theme.name} 
                      width={120} 
                      height={120} 
                      className="object-contain max-h-32"
                    />
                  ) : (
                    <div 
                      className="w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl font-bold"
                      style={{ backgroundColor: theme.color || '#4338ca' }}
                    >
                      {theme.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="p-6 flex-grow">
                  <h3 className="text-xl font-bold mb-2">{theme.name}</h3>
                  <p className="text-gray-300 text-sm">
                    {theme.description || `Competitions related to ${theme.name} technologies and innovations.`}
                  </p>
                </div>
                <div className="px-6 pb-4">
                  <button className="w-full py-2 rounded-md bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all text-sm font-medium">
                    View Competitions
                  </button>
                </div>
              </div>
            ))
          ) : (
            // Placeholder cards when no themes are available
            Array.from({ length: 4 }).map((_, index) => (
              <div 
                key={index} 
                className="bg-gradient-to-br from-gray-900 to-indigo-900 rounded-xl overflow-hidden shadow-lg flex flex-col"
              >
                <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-800 relative flex items-center justify-center p-4">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl font-bold">
                    T
                  </div>
                </div>
                <div className="p-6 flex-grow">
                  <h3 className="text-xl font-bold mb-2">Technology Theme</h3>
                  <p className="text-gray-300 text-sm">
                    Exciting competitions related to cutting-edge technologies and innovations.
                  </p>
                </div>
                <div className="px-6 pb-4">
                  <button className="w-full py-2 rounded-md bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all text-sm font-medium">
                    View Competitions
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
